// api/weather.js
// Tool: get_weather_forecast(destination, month)
// Called by ElevenLabs when Zayed needs climate data for a destination

const DESTINATIONS = {
  // Europe
  "tbilisi":       { lat: 41.6938, lon: 44.8015, label: "Tbilisi, Georgia" },
  "lisbon":        { lat: 38.7169, lon: -9.1395, label: "Lisbon, Portugal" },
  "paris":         { lat: 48.8566, lon: 2.3522,  label: "Paris, France" },
  "rome":          { lat: 41.9028, lon: 12.4964, label: "Rome, Italy" },
  "amsterdam":     { lat: 52.3676, lon: 4.9041,  label: "Amsterdam, Netherlands" },
  "madrid":        { lat: 40.4168, lon: -3.7038, label: "Madrid, Spain" },
  "athens":        { lat: 37.9838, lon: 23.7275, label: "Athens, Greece" },
  "santorini":     { lat: 36.3932, lon: 25.4615, label: "Santorini, Greece" },
  "copenhagen":    { lat: 55.6761, lon: 12.5683, label: "Copenhagen, Denmark" },
  "prague":        { lat: 50.0755, lon: 14.4378, label: "Prague, Czech Republic" },
  "amalfi coast":  { lat: 40.6340, lon: 14.6027, label: "Amalfi Coast, Italy" },
  "iceland":       { lat: 64.1265, lon: -21.8174,label: "Reykjavik, Iceland" },
  "reykjavik":     { lat: 64.1265, lon: -21.8174,label: "Reykjavik, Iceland" },
  "slovenia":      { lat: 46.0569, lon: 14.5058, label: "Ljubljana, Slovenia" },
  "mykonos":       { lat: 37.4467, lon: 25.3289, label: "Mykonos, Greece" },
  "ireland":       { lat: 53.3498, lon: -6.2603, label: "Dublin, Ireland" },
  // Asia
  "tokyo":         { lat: 35.6762, lon: 139.6503,label: "Tokyo, Japan" },
  "kyoto":         { lat: 35.0116, lon: 135.7681,label: "Kyoto, Japan" },
  "bali":          { lat: -8.4095, lon: 115.1889,label: "Bali, Indonesia" },
  "bangkok":       { lat: 13.7563, lon: 100.5018,label: "Bangkok, Thailand" },
  "singapore":     { lat: 1.3521,  lon: 103.8198,label: "Singapore" },
  "seoul":         { lat: 37.5665, lon: 126.9780,label: "Seoul, South Korea" },
  "kuala lumpur":  { lat: 3.1390,  lon: 101.6869,label: "Kuala Lumpur, Malaysia" },
  "sri lanka":     { lat: 6.9271,  lon: 79.8612, label: "Colombo, Sri Lanka" },
  "bhutan":        { lat: 27.4728, lon: 89.6390, label: "Thimphu, Bhutan" },
  // Middle East & Africa
  "abu dhabi":     { lat: 24.4539, lon: 54.3773, label: "Abu Dhabi, UAE" },
  "dubai":         { lat: 25.2048, lon: 55.2708, label: "Dubai, UAE" },
  "maldives":      { lat: 3.2028,  lon: 73.2207, label: "Maldives" },
  "morocco":       { lat: 31.7917, lon: -7.0926, label: "Marrakech, Morocco" },
  "marrakech":     { lat: 31.6295, lon: -7.9811, label: "Marrakech, Morocco" },
  "casablanca":    { lat: 33.5731, lon: -7.5898, label: "Casablanca, Morocco" },
  "nairobi":       { lat: -1.2921, lon: 36.8219, label: "Nairobi, Kenya" },
  "rwanda":        { lat: -1.9403, lon: 29.8739, label: "Kigali, Rwanda" },
  "egypt":         { lat: 30.0444, lon: 31.2357, label: "Cairo, Egypt" },
  "cairo":         { lat: 30.0444, lon: 31.2357, label: "Cairo, Egypt" },
  "johannesburg":  { lat: -26.2041,lon: 28.0473, label: "Johannesburg, South Africa" },
  // Americas
  "new york":      { lat: 40.7128, lon: -74.0060,label: "New York, USA" },
  "patagonia":     { lat: -51.6230,lon: -69.2168,label: "Patagonia, Argentina" },
  "brazil":        { lat: -23.5505,lon: -46.6333,label: "São Paulo, Brazil" },
  "peru":          { lat: -12.0464,lon: -77.0428,label: "Lima, Peru" },
  "mexico city":   { lat: 19.4326, lon: -99.1332,label: "Mexico City, Mexico" },
  "oaxaca":        { lat: 17.0669, lon: -96.7203,label: "Oaxaca, Mexico" },
  // Oceania
  "sydney":        { lat: -33.8688,lon: 151.2093,label: "Sydney, Australia" },
  "new zealand":   { lat: -36.8509,lon: 174.7645,label: "Auckland, New Zealand" },
};

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7,
  aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function resolveDestination(input) {
  const key = input.toLowerCase().trim();
  if (DESTINATIONS[key]) return DESTINATIONS[key];
  // Fuzzy match — find first destination whose key contains the input
  const match = Object.keys(DESTINATIONS).find(k => k.includes(key) || key.includes(k));
  return match ? DESTINATIONS[match] : null;
}

function resolveMonth(input) {
  const key = input.toLowerCase().trim();
  return MONTHS[key] || parseInt(key) || null;
}

function getWeatherSummary(maxTemp, minTemp, precipitation) {
  const avg = Math.round((maxTemp + minTemp) / 2);
  let rainDesc;
  if (precipitation < 30) rainDesc = "very little rain — ideal conditions";
  else if (precipitation < 60) rainDesc = "some rain possible, mostly dry";
  else if (precipitation < 100) rainDesc = "moderate rainfall — pack a light jacket";
  else rainDesc = "significant rainfall — not the best time";

  let tempDesc;
  if (avg < 5) tempDesc = "cold";
  else if (avg < 12) tempDesc = "cool";
  else if (avg < 20) tempDesc = "mild and pleasant";
  else if (avg < 28) tempDesc = "warm and comfortable";
  else tempDesc = "hot";

  return { avg, maxTemp, minTemp, precipitation, rainDesc, tempDesc };
}

export default async function handler(req, res) {
  // Allow CORS for ElevenLabs
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // ElevenLabs sends parameters either at root or nested under "parameters"
    const body = req.body || {};
    const params = body.parameters || body;
    const { destination, month } = params;

    if (!destination || !month) {
      return res.status(400).json({ result: "I need both a destination and a month to check the weather." });
    }

    const dest = resolveDestination(destination);
    if (!dest) {
      return res.status(200).json({ result: `I don't have climate data for ${destination} yet, but I can give you a general seasonal recommendation based on the region.` });
    }

    const monthNum = resolveMonth(month);
    if (!monthNum) {
      return res.status(200).json({ result: `I couldn't parse the month "${month}". Please try again with a month name like "May" or "October".` });
    }

    // Use ERA5 reanalysis data from Open-Meteo (free, no API key, historical climate normals)
    // We use 1991-2020 as the climate reference period
    const refYear = monthNum <= 12 ? "2010" : "2009";
    const monthStr = String(monthNum).padStart(2, "0");
    const daysInMonth = new Date(2010, monthNum, 0).getDate();

    const url = `https://climate-api.open-meteo.com/v1/climate?latitude=${dest.lat}&longitude=${dest.lon}&start_date=1991-${monthStr}-01&end_date=2020-${monthStr}-${daysInMonth}&models=ERA5&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);

    const data = await response.json();
    const daily = data.daily;

    if (!daily || !daily.temperature_2m_max) {
      throw new Error("No climate data returned");
    }

    // Calculate 30-year monthly averages
    const avgMax  = Math.round(daily.temperature_2m_max.reduce((a, b) => a + b, 0) / daily.temperature_2m_max.length);
    const avgMin  = Math.round(daily.temperature_2m_min.reduce((a, b) => a + b, 0) / daily.temperature_2m_min.length);
    const avgPrec = Math.round(daily.precipitation_sum.reduce((a, b) => a + b, 0) / daily.precipitation_sum.length * daysInMonth);

    const summary = getWeatherSummary(avgMax, avgMin, avgPrec);

    const result = `${dest.label} in ${month}: ${summary.tempDesc}, averaging ${summary.avg}°C (highs around ${summary.maxTemp}°C, lows ${summary.minTemp}°C). Rainfall: ${summary.rainDesc} — about ${summary.precipitation}mm for the month.`;

    return res.status(200).json({ result });

  } catch (err) {
    console.error("Weather handler error:", err);
    return res.status(200).json({
      result: "I couldn't retrieve live climate data right now, but based on my knowledge I can give you a seasonal overview for that destination."
    });
  }
}
