// api/flights.js
// Tool: search_flights(origin, destination, month, cabin_class)
// Uses SerpApi Google Flights — returns top options mentioning Etihad

const AIRPORT_CODES = {
    "london":"LHR","paris":"CDG","new york":"JFK","sydney":"SYD","tokyo":"NRT",
    "johannesburg":"JNB","mumbai":"BOM","bangkok":"BKK","seoul":"ICN",
    "kuala lumpur":"KUL","singapore":"SIN","frankfurt":"FRA","amsterdam":"AMS",
    "madrid":"MAD","rome":"FCO","casablanca":"CMN","nairobi":"NBO","cairo":"CAI",
    "dubai":"DXB","abu dhabi":"AUH","manchester":"MAN","milan":"MXP","zurich":"ZRH",
    "istanbul":"IST","barcelona":"BCN","munich":"MUC","brussels":"BRU",
    "tbilisi":"TBS","lisbon":"LIS","athens":"ATH","reykjavik":"KEF","iceland":"KEF",
    "maldives":"MLE","bali":"DPS","kyoto":"KIX","mexico city":"MEX","peru":"LIM",
    "brazil":"GRU","sao paulo":"GRU","bhutan":"PBH","sri lanka":"CMB","rwanda":"KGL",
    "marrakech":"RAK","morocco":"RAK","santorini":"JTR","mykonos":"JMK",
    "prague":"PRG","copenhagen":"CPH","slovenia":"LJU","ireland":"DUB","dublin":"DUB",
    "patagonia":"EZE","oaxaca":"OAX","colombo":"CMB",
};

const CABIN_MAP = {"economy":"1","premium economy":"2","premium":"2","business":"3","business class":"3","first":"4","first class":"4"};
const CABIN_LABEL = {"1":"Economy","2":"Premium Economy","3":"Business","4":"First"};

function resolveAirport(input) {
    if (!input) return null;
    const key = input.toLowerCase().trim();
    if (/^[a-z]{3}$/i.test(key)) return key.toUpperCase();
    return AIRPORT_CODES[key] || null;
}

function resolveMonth(input) {
    const months = {january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
    const key = input?.toLowerCase().trim();
    return months[key] || parseInt(key) || null;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

  try {
        const body = req.body || {};
        const params = body.parameters || body;
        const { origin = "AUH", destination, month, cabin_class = "economy" } = params;

      if (!destination) return res.status(200).json({ result: "I need a destination to search for flights." });

      const originCode = resolveAirport(origin) || "AUH";
        const destCode = resolveAirport(destination);
        const cabinCode = CABIN_MAP[cabin_class?.toLowerCase()] || "1";
        const cabinLabel = CABIN_LABEL[cabinCode];
        const monthNum = resolveMonth(month);

      if (!destCode) {
              return res.status(200).json({ result: `Etihad flies to over 70 destinations from Abu Dhabi. For ${destination}, I recommend checking etihad.com directly for confirmed routes.` });
      }

      const now = new Date();
        let year = now.getFullYear();
        if (monthNum && monthNum <= now.getMonth()) year++;
        const monthStr = String(monthNum || (now.getMonth() + 2)).padStart(2,"0");
        const departureDate = `${year}-${monthStr}-15`;

      const searchParams = new URLSearchParams({
              engine: "google_flights",
              departure_id: originCode,
              arrival_id: destCode,
              outbound_date: departureDate,
              currency: "USD",
              hl: "en",
              travel_class: cabinCode,
              api_key: process.env.SERPAPI_KEY,
      });

      const response = await fetch(`https://serpapi.com/search?${searchParams}`);
        if (!response.ok) throw new Error(`SerpApi ${response.status}`);
        const data = await response.json();

      const allFlights = [...(data.best_flights || []), ...(data.other_flights || [])];

      if (!allFlights.length) {
              return res.status(200).json({
                        result: `I checked Google Flights for ${originCode} to ${destCode} in ${cabinLabel} class. Etihad connects this route via Abu Dhabi — I recommend checking etihad.com for exact fares and availability. Would you like me to build your itinerary in the meantime?`
              });
      }

      const top = allFlights.slice(0, 3);
        const lines = top.map((f, i) => {
                const price = f.price ? `USD ${Math.round(f.price).toLocaleString()}` : "price on request";
                const mins = f.total_duration;
                const dur = mins ? `${Math.floor(mins/60)}h ${mins%60}m` : "";
                const stops = f.flights?.length > 1 ? `${f.flights.length - 1} stop` : "direct";
                const airline = f.flights?.[0]?.airline || "airline";
                return `Option ${i+1}: ${price} — ${airline}, ${stops}${dur ? `, ${dur}` : ""}`;
        });

      const result = `Here are ${cabinLabel} class flights from ${originCode} to ${destCode} around ${month || "your dates"}:\n\n${lines.join("\n")}\n\nEtihad flies this route via Abu Dhabi — worth considering a stopover night there. Ready to confirm and move to booking?`;
        return res.status(200).json({ result });

  } catch (err) {
        console.error("Flights error:", err.message);
        return res.status(200).json({ result: "I couldn't pull live flight data right now. Etihad has excellent connectivity from Abu Dhabi to this destination — shall I help build your itinerary while you check etihad.com for fares?" });
  }
}
