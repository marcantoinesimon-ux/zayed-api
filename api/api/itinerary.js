// api/itinerary.js
// Tool: get_itinerary(destination, interests, duration_days)
// Uses Claude to generate a curated, voice-friendly day-by-day itinerary

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const params = body.parameters || body;
    const {
      destination,
      interests = "culture, food, local experiences",
      duration_days = 5,
    } = params;

    if (!destination) {
      return res.status(200).json({ result: "I need a destination to build an itinerary." });
    }

    const prompt = `You are a luxury travel advisor building a spoken itinerary for an Etihad Airways customer.

Destination: ${destination}
Interests: ${interests}
Duration: ${duration_days} days

Create a concise day-by-day itinerary. Rules:
- Name specific restaurants, neighbourhoods, landmarks, and experiences (no generics)
- Each day: one morning, one afternoon, one evening activity — keep it realistic, not exhausting
- Tone: warm, specific, conversational — written to be READ ALOUD by a voice AI
- No bullet points. Write in flowing sentences.
- Keep the full itinerary under 300 words — it will be spoken, not read
- End with one practical insider tip for the destination

Format:
Day 1: [Theme]. [Morning activity]. In the afternoon, [afternoon]. For the evening, [evening].
Day 2: ...
(continue for all days)
Insider tip: ...`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            process.env.ANTHROPIC_API_KEY,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-opus-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const data = await response.json();
    const itinerary = data.content?.[0]?.text || "";

    if (!itinerary) throw new Error("Empty itinerary response");

    return res.status(200).json({ result: itinerary });

  } catch (err) {
    console.error("Itinerary handler error:", err);
    return res.status(200).json({
      result: "I'm having trouble generating the full itinerary right now. Let me give you a quick overview instead — what are the top two or three things you'd most like to do there?"
    });
  }
}
