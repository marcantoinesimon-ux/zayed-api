// api/weather.js
// Tool: get_weather_forecast(destination, month)
// Handles near-term (next week) AND monthly travel planning queries

const DEST = {
  "tbilisi":{lat:41.69,lon:44.80,label:"Tbilisi, Georgia"},
  "lisbon":{lat:38.72,lon:-9.14,label:"Lisbon, Portugal"},
  "paris":{lat:48.86,lon:2.35,label:"Paris, France"},
  "rome":{lat:41.90,lon:12.50,label:"Rome, Italy"},
  "amsterdam":{lat:52.37,lon:4.90,label:"Amsterdam, Netherlands"},
  "athens":{lat:37.98,lon:23.73,label:"Athens, Greece"},
  "santorini":{lat:36.39,lon:25.46,label:"Santorini, Greece"},
  "mykonos":{lat:37.45,lon:25.33,label:"Mykonos, Greece"},
  "prague":{lat:50.08,lon:14.44,label:"Prague, Czech Republic"},
  "copenhagen":{lat:55.68,lon:12.57,label:"Copenhagen, Denmark"},
  "iceland":{lat:64.13,lon:-21.82,label:"Reykjavik, Iceland"},
  "reykjavik":{lat:64.13,lon:-21.82,label:"Reykjavik, Iceland"},
  "ireland":{lat:53.35,lon:-6.26,label:"Dublin, Ireland"},
  "madrid":{lat:40.42,lon:-3.70,label:"Madrid, Spain"},
  "slovenia":{lat:46.06,lon:14.51,label:"Ljubljana, Slovenia"},
  "tokyo":{lat:35.68,lon:139.65,label:"Tokyo, Japan"},
  "kyoto":{lat:35.01,lon:135.77,label:"Kyoto, Japan"},
  "bali":{lat:-8.41,lon:115.19,label:"Bali, Indonesia"},
  "bangkok":{lat:13.76,lon:100.50,label:"Bangkok, Thailand"},
  "singapore":{lat:1.35,lon:103.82,label:"Singapore"},
  "seoul":{lat:37.57,lon:126.98,label:"Seoul, South Korea"},
  "sri lanka":{lat:7.87,lon:80.77,label:"Sri Lanka"},
  "colombo":{lat:6.93,lon:79.86,label:"Colombo, Sri Lanka"},
  "bhutan":{lat:27.47,lon:89.64,label:"Thimphu, Bhutan"},
  "maldives":{lat:3.20,lon:73.22,label:"Maldives"},
  "abu dhabi":{lat:24.45,lon:54.38,label:"Abu Dhabi, UAE"},
  "dubai":{lat:25.20,lon:55.27,label:"Dubai, UAE"},
  "morocco":{lat:31.63,lon:-7.98,label:"Marrakech, Morocco"},
  "marrakech":{lat:31.63,lon:-7.98,label:"Marrakech, Morocco"},
  "nairobi":{lat:-1.29,lon:36.82,label:"Nairobi, Kenya"},
  "rwanda":{lat:-1.94,lon:29.87,label:"Kigali, Rwanda"},
  "cairo":{lat:30.04,lon:31.24,label:"Cairo, Egypt"},
  "egypt":{lat:30.04,lon:31.24,label:"Cairo, Egypt"},
  "johannesburg":{lat:-26.20,lon:28.05,label:"Johannesburg, South Africa"},
  "new york":{lat:40.71,lon:-74.01,label:"New York, USA"},
  "brazil":{lat:-23.55,lon:-46.63,label:"Sao Paulo, Brazil"},
  "peru":{lat:-12.05,lon:-77.04,label:"Lima, Peru"},
  "mexico city":{lat:19.43,lon:-99.13,label:"Mexico City, Mexico"},
  "oaxaca":{lat:17.07,lon:-96.72,label:"Oaxaca, Mexico"},
  "sydney":{lat:-33.87,lon:151.21,label:"Sydney, Australia"},
  "new zealand":{lat:-36.85,lon:174.76,label:"Auckland, New Zealand"},
};

const MONTHS = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
};

function resolveDest(input) {
  const k = input?.toLowerCase().trim();
  if (!k) return null;
  if (DEST[k]) return DEST[k];
  const m = Object.keys(DEST).find(d => d.includes(k) || k.includes(d));
  return m ? DEST[m] : null;
}

function isNearTerm(m) {
  if (!m) return true;
  const l = m.toLowerCase();
  return l.includes("week") || l.includes("today") || l.includes("soon")
      || l.includes("now") || l.includes("tomorrow") || l.includes("this month");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const p = req.body?.parameters || req.body || {};
    const { destination, month } = p;

    if (!destination) {
      return res.status(200).json({ result: "I need a destination to check the weather." });
    }

    const dest = resolveDest(destination);
    if (!dest) {
      return res.status(200).json({ result: `I don't have climate data for ${destination} yet, but I can share seasonal knowledge for that region.` });
    }

    // Near-term: use 7-day forecast API (handles "next week", "soon", etc.)
    if (isNearTerm(month)) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${dest.lat}&longitude=${dest.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`forecast ${r.status}`);
      const d = await r.json();
      const hi   = Math.round(d.daily.temperature_2m_max.reduce((a,b)=>a+b,0)/7);
      const lo   = Math.round(d.daily.temperature_2m_min.reduce((a,b)=>a+b,0)/7);
      const rain = Math.round(d.daily.precipitation_probability_max.reduce((a,b)=>a+b,0)/7);
      const rd   = rain < 20 ? "very little rain expected — great conditions"
                 : rain < 50 ? "some chance of showers on a few days"
                 : "significant rainfall likely most days";
      return res.status(200).json({
        result: `${dest.label} over the next 7 days: highs around ${hi}°C, lows ${lo}°C. ${rd} (${rain}% average rain probability). ${rain > 50 ? "Pack an umbrella." : "Looks like decent weather."}`
      });
    }

    // Monthly planning: use historical climate normals
    const mn  = MONTHS[month?.toLowerCase().trim()] || (new Date().getMonth() + 1);
    const ms  = String(mn).padStart(2, "0");
    const dim = new Date(2009, mn, 0).getDate();
    const url = `https://climate-api.open-meteo.com/v1/climate?latitude=${dest.lat}&longitude=${dest.lon}&start_date=2000-${ms}-01&end_date=2009-${ms}-${dim}&models=ERA5&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`;
    const r   = await fetch(url);
    if (!r.ok) throw new Error(`climate ${r.status}`);
    const d   = await r.json();
    const hi  = Math.round(d.daily.temperature_2m_max.reduce((a,b)=>a+b,0)/d.daily.temperature_2m_max.length);
    const lo  = Math.round(d.daily.temperature_2m_min.reduce((a,b)=>a+b,0)/d.daily.temperature_2m_min.length);
    const prec = Math.round(d.daily.precipitation_sum.reduce((a,b)=>a+b,0)/d.daily.precipitation_sum.length * dim);
    const rd   = prec < 30  ? "very little rain — excellent conditions"
               : prec < 70  ? "some rainfall but mostly pleasant"
               : prec < 120 ? "moderate rain — pack a light jacket"
               : "heavy rainfall season — consider an alternative month";
    return res.status(200).json({
      result: `${dest.label} in ${month}: ${hi}°C highs, ${lo}°C lows. ${rd} (~${prec}mm for the month).`
    });

  } catch (err) {
    console.error("Weather error:", err.message);
    return res.status(200).json({
      result: "I couldn't pull live weather data right now. What else can I help you plan for this trip?"
    });
  }
}
