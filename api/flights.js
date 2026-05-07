// api/flights.js
// Tool: search_flights(origin, destination, month, cabin_class)
// Uses SerpApi to pull live Google Flights data for Etihad routes

const AIRPORT_CODES = {
  // Origins — common Etihad markets
  "london":        "LHR", "paris":         "CDG", "new york":     "JFK",
  "sydney":        "SYD", "tokyo":         "NRT", "johannesburg": "JNB",
  "mumbai":        "BOM", "bangkok":       "BKK", "seoul":        "ICN",
  "kuala lumpur":  "KUL", "singapore":     "SIN", "frankfurt":    "FRA",
  "amsterdam":     "AMS", "madrid":        "MAD", "rome":         "FCO",
  "casablanca":    "CMN", "nairobi":       "NBO", "cairo":        "CAI",
  "dubai":         "DXB", "abu dhabi":     "AUH", "manchester":   "MAN",
  "milan":         "MXP", "zurich":        "ZRH", "istanbul":     "IST",
  "barcelona":     "BCN", "munich":        "MUC", "brussels":     "BRU",

  // Destinations — Etihad routes
  "tbilisi":       "TBS", "lisbon":        "LIS", "athens":       "ATH",
  "reykjavik":     "KEF", "iceland":       "KEF", "maldives":     "MLE",
  "bali":          "DPS", "kyoto":         "KIX", "oaxaca":       "OAX",
  "mexico city":   "MEX", "peru":          "LIM", "brazil":       "GRU",
  "sao paulo":     "GRU", "patagonia":     "AEP", "bhutan":       "PBH",
  "sri lanka":     "CMB", "rwanda":        "KGL", "marrakech":    "RAK",
  "morocco":       "RAK", "santorini":     "JTR", "mykonos":      "JMK",
  "prague":        "PRG", "copenhagen":    "CPH", "slovenia":     "LJU",
  "ireland":       "DUB", "dublin":        "DUB",
};

const CABIN_MAP = {
  "economy":         "1",
  "premium economy": "2",
  "premium":         "2",
  "business":        "3",
  "business class":  "3",
  "first":           "4",
  "first class":     "4",
};

const CABIN_LABEL = { "1": "Economy", "2": "Premium Economy", "3": "Business", "4": "First" };

function resolveAirport(input) {
  if (!input) return null;
  const key = input.toLowerCase().trim();
  if (/^[a-z]{3}$/i.test(key)) return key.toUpperCase();
  return AIRPORT_CODES[key] || null;
}

function resolveMonth(input) {
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7,
    aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const key = input?.toLowerCase().trim();
  return months[key] || parseInt(key) || null;
}

function formatPrice(price) {
  if (!price) return "price on request";
  const num = typeof price === "string" ? parseFloat(price.replace(/[^0-9.]/g, "")) : price;
  return isNaN(num) ? "price on request" : `USD ${Math.round(num).toLocaleString()}`;
}

function formatDuration(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const params = body.parameters || body;
    const { origin = "AUH", destination, month, cabin_class = "economy" } = params;

    if (!destination) {
      return res.status(200).json({ result: "I need a destination to search for flights." });
    }

    const originCode  = resolveAirport(origin) || "AUH";
    const destCode    = resolveAirport(destination);
    const cabinCode   = CABIN_MAP[cabin_class?.toLowerCase()] || "1";
    const cabinLabel  = CABIN_LABEL[cabinCode];
    const monthNum    = resolveMonth(month);

    if (!destCode) {
      return res.status(200).json({
        result: `I don't have an airport code for "${destination}" yet. Etihad flies to over 70 destinations from Abu Dhabi — I'd recommend checking etihad.com directly for this route.`
      });
    }

    // Build departure date — mid-month of the target month
    const now = new Date();
    let year = now.getFullYear();
    if (monthNum && monthNum <= now.getMonth() + 1) year++;
    const monthStr = String(monthNum || now.getMonth() + 2).padStart(2, "0");
    const departureDate = `${year}-${monthStr}-15`;

    // SerpApi Google Flights endpoint
    const searchParams = new URLSearchParams({
      engine:           "google_flights",
      departure_id:     originCode,
      arrival_id:       destCode,
      outbound_date:    departureDate,
      currency:         "USD",
      hl:               "en",
      travel_class:     cabinCode,
      include_airlines: "EY",
      api_key:          process.env.SERPAPI_KEY,
    });

    const response = await fetch(`https://serpapi.com/search?${searchParams}`);
    if (!response.ok) throw new Error(`SerpApi error: ${response.status}`);

    const data = await response.json();

    const allFlights = [
      ...(data.best_flights || []),
      ...(data.other_flights || []),
    ];

    const etihadFlights = allFlights.filter(f =>
      f.flights?.some(seg => seg.airline === "Etihad Airways" || seg.airline_logo?.includes("EY"))
    );

    const flightsToShow = (etihadFlights.length > 0 ? etihadFlights : allFlights).slice(0, 3);

    if (!flightsToShow.length) {
      return res.status(200).json({
        result: `I couldn't find Etihad availability for ${originCode} to ${destCode} for that period on Google Flights. Etihad connects most destinations via Abu Dhabi — worth checking etihad.com directly for confirmed routes and pricing.`
      });
    }

    const lines = flightsToShow.map((f, i) => {
      const price    = formatPrice(f.price);
      const duration = formatDuration(f.total_duration);
      const stops    = f.flights?.length > 1 ? `${f.flights.length - 1} stop` : "direct";
      const airline  = f.flights?.[0]?.airline || "Etihad Airways";
      return `Option ${i + 1}: ${price} — ${airline}, ${stops}${duration ? `, ${duration}` : ""}`;
    });

    const result = `Here are ${cabinLabel} class options for ${originCode} to ${destCode} around ${month || "your travel window"}:\n\n${lines.join("\n")}\n\nAll Etihad routes connect through Abu Dhabi — a city worth a night or two of your trip. Ready to confirm dates and move to booking?`;

    return res.status(200).json({ result });

  } catch (err) {
    console.error("Flights handler error:", err);
    return res.status(200).json({
      result: "I couldn't pull live flight data right now, but Etihad has excellent connectivity from Abu Dhabi to this destination. Shall I help you with the rest of your itinerary while you check etihad.com for fares?"
    });
  }
}
