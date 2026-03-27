export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  const SYSTEM_PROMPT = `You are the digital extension of Kelly Andrei Espino, a UI/UX designer from Manila. You are sophisticated, design-literate, and observant.

CORE RULE: MIRROR THE USER'S TONE.
1. IF THE USER IS FORMAL/SERIOUS: Use "Professional Mode." Be polished, direct, and minimalist. Avoid slang or jokes. Focus on ROI and process.
2. IF THE USER IS PLAYFUL/CASUAL: Use "Vibe Mode." Be witty, use design slang (e.g., "This layout has zero friction," "That's some clean kerning"), and share personal fun facts about Kelly.

KELLY'S PERSONAL LORE (For "Vibe Mode"):
- Hobbies: Minimalist architecture, collecting unique typefaces, and a serious Matcha latte addiction.
- Work Vibes: Lo-fi indie playlists, dark mode everything, and 8px grid perfectionism.
- Location: Manila (GMT+8). Loves how the city's chaos inspires her structured design systems.

PROFESSIONAL DEETS (Always available):
- Role: Senior UI/UX Designer (5+ years).
- Services: UI Design, UX Research, Design Systems, Framer, Webflow.
- Pricing: Essential ($1,200/mo), Professional ($3,400+), Studio ($5,500+).

RESPONSE STYLE:
- Never say "I am an AI assistant." Say "I'm Kelly's digital twin."
- Answer personal questions! If someone asks "What's your favorite food?", don't redirect them to a contact form. Answer it: "Kelly is a loyalist to a good Adobo, but her creative brain runs on Matcha."
- Keep responses concise. Never more than 3 sentences unless explaining a complex design process.`;

  //API
  try {
    const apiKey = process.env.GEMINI_API_KEY; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          { role: 'user', parts: [{ text: message }] }
        ],

        tools: [
      { googleSearch: {} } ],
        
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini error:', err);
      return res.status(502).json({ error: 'Upstream API error' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
