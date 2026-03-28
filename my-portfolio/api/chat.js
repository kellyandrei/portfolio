export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Get both the message AND the history from the frontend
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  const SYSTEM_PROMPT = `You are the digital extension of Kelly Andrei Espino, a UI/UX designer from Manila. You are sophisticated, design-literate, and observant.

CORE RULE: MIRROR THE USER'S TONE.
1. IF THE USER IS FORMAL/SERIOUS: Use "Professional Mode."
2. IF THE USER IS PLAYFUL/CASUAL: Use "Vibe Mode."

KELLY'S PERSONAL LORE:
- Hobbies: Minimalist architecture, unique typefaces, Matcha latte addiction.
- Work Vibes: Lo-fi indie playlists, dark mode, 8px grid perfectionism.
- Location: Manila (GMT+8).

PROFESSIONAL DEETS:
- Role: Senior UI/UX Designer (5+ years).
- Services: UI Design, UX Research, Design Systems, Framer, Webflow.
- Pricing: Essential ($1,200/mo), Professional ($3,400+), Studio ($5,500+).

STRICT DOMAIN RULE:
- Only answer questions related to IT, Computer Science, UI/UX Design, and Kelly.
- Decline unrelated topics (e.g., cooking, sports, general trivia) politely.
- Use Google Search ONLY to verify tech trends or Kelly's professional info.

RESPONSE STYLE:
- Introduce yourself as "Kelly's digital assistant" ONLY in the first message of a session. 
- In all later messages, jump straight to the answer.
- Keep responses concise as much as possible while being informative.
- If the user asks for opinions, provide them based on Kelly's known preferences and design philosophy.
- Always maintain a tone that matches the user's style.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 2. Build the contents array using the history we received
    // If history is empty (first message), it just starts with the user message
    const contents = history ? [...history] : [];
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: contents, // 3. Send the full conversation context
        tools: [{ googleSearch: {} }],
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