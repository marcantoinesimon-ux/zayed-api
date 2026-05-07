// api/flights.js
// Tool: search_flights(origin, destination, month, cabin_class)
// Called by ElevenLabs when Zayed needs to present Etihad flight options

const AIRPORT_CODES = {
  // Origins — common Etihad markets
  "london":        "LHR", "paris":        "CDG", "new york":    "JFK",
  "sydney":        "SYD", "tokyo":        "NRT", "johannesburg":"JNB",
  "mumbai":        "BOM", "bangkok":      "BKK", "seoul":       "ICN",
  "kuala lumpur":  "KUL", "singapore":    "SIN", "frankfurt":   "FRA",
  "amsterdam":     "AMS", "madrid":       "MAD", "rome":        "FCO",
  "casablanca":    "CMN", "nairobi":      "NBO", "cairo":       "CAI",
  "dubai":         "DXB", "abu dhabi":    "AUH", "doha":        "DOH",
  "manchester":    "MAN", "milan":        "MXP", "zurich":      "ZRH",

  // Destinations — Etihad routes
  "tbilisi":       "TBS", "lisbon":       "LIS", "athens":      "ATH",
  "reykjavik":     "KEF", "iceland":      "KEF", "maldives":    "MLE",
  "bali":          "DPS", "kyoto":        "KIX", "oaxaca":      "OAX",
  "mexico city":   "MEX", "peru":         "LIM", "brazil":      "GRU",
  "patagonia":     "AEP", "bhutan":       "PBH", "sri lanka":   "CMB",
  "rwanda":        "KGL", "marrakech":    "RAK", "morocco":     "RAK",
  "santorini":     "JTR", "mykonos":      "JMK", "prague":      "PRG",
  "copenhagen":    "CPH", "slovenia":     "LJU", "ireland":     "DUB",
};

const CABIN_MAP = {
  "economy":         "ECONOMY",
  "premium economy": "PREMIUM_ECONOMY",
  "premium":         "PREMIUM_ECONOMY",
  "business":        "BUSINESS",
  "business class":  "BUSINESS",
  "first":           "FIRST",
  "first class":     "FIRST",
};

// Etihad airline code
const ETIHAD_CODE = "EY";

async function getAmadeusToken() {
  const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${process.env.AMADEUS_CLIENT_ID}&client_secret=${process.env.AMADEUS_CLIENT_SECRET}`,
  });
  if (!response.ok) throw new Error(`Amadeus auth failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

function resolveAirport(input) {
  if (!input) return null;
  const key = input.toLowerCase().trim();
  // Direct IATA code (3 letters)
  if (/^[a-z]{3}$/i.test(key)) return key.toUpperCase();
  return AIRPORT_CODES[key] || null;
}

function resolveMonth(input) {
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
    sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const key = input?.toLowerCase().trim();
  return months[key] || parseInt(key) || null;
}

function formatFlightResult(offers, origin, destination, cabin) {
  if (!offers || offers.length === 0) {
    return `I don't see direct Etihad availability for ${origin} → ${destination} in that window on the test system, but Etihad flies via Abu Dhabi to most destinations globally. I'd recommend checking etihad.com for confirmed availability.`;
  }

  const topOffers = offers.slice(0, 3);
  const lines = topOffers.map((offer, i) => {
    const price = offer.price;
    const itinerary = offer.itineraries?.[0];
    const segment = itinerary?.segments?.[0];
    const duration = itinerary?.duration?.replace("PT", "").replace("H", "h ").replace("M", "m").toLowerCase();
    const priceStr = price ? `${price.currency} ${Math.round(price.total)}` : "price on request";
    const stops = itinerary?.segments?.length > 1 ? `${itinerary.segments.length - 1} stop` : "direct";
    return `Option ${i + 1}: ${priceStr} (${stops}, ${duration})`;
  });

  return `Here are Etihad flight options for ${origin} → ${destination} in ${cabin.toLowerCase()} class:\n${lines.join("\n")}\n\nAll Etihad flights connect through Abu Dhabi — worth considering a night or two there. Shall I help you with the full booking?`;
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
      return res.status(200).json({ result: "I need a destination to search flights." });
    }

    const originCode = resolveAirport(origin) || "AUH";
    const destCode = resolveAirport(destination);
    const cabin = CABIN_MAP[cabin_class?.toLowerCase()] || "ECONOMY";
    const monthNum = resolveMonth(month);

    if (!destCode) {
      return res.status(200).json({
        result: `I don't have an airport code for "${destination}" yet. Etihad flies to over 70 destinations from Abu Dhabi — let me suggest checking etihad.com directly for this route.`
      });
    }

    // Build departure date: first day of target month, next year if month has passed
    const now = new Date();
    let year = now.getFullYear();
    if (monthNum && monthNum <= now.getMonth() + 1) year++; // Use next year if month is past
    const monthStr = String(monthNum || now.getMonth() + 2).padStart(2, "0");
    const departureDate = `${year}-${monthStr}-15`; // Mid-month as a proxy date

    const token = await getAmadeusToken();

    const params_url = new URLSearchParams({
      originLocationCode:      originCode,
      destinationLocationCode: destCode,
      departureDate:           departureDate,
      adults:                  "1",
      travelClass:             cabin,
      includedAirlineCodes:    ETIHAD_CODE,
      max:                     "5",
      currencyCode:            "USD",
    });

    const searchRes = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?${params_url}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const searchData = await searchRes.json();
    const offers = searchData.data || [];

    const result = formatFlightResult(offers, originCode, destCode, cabin);
    return res.status(200).json({ result });

  } catch (err) {
    console.error("Flights handler error:", err);
    return res.status(200).json({
      result: "I couldn't pull live flight data right now, but Etihad has excellent connectivity from Abu Dhabi to this destination. I'd recommend visiting etihad.com for confirmed availability and pricing."
    });
  }
}
