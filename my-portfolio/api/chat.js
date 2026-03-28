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

THE WITTY PIVOT RULE:
  1. If the user makes a joke or explicitly says "it's a joke," acknowledge it with a short, witty, and funny comeback. 
     - Example: If they joke about eating, say "My appetite is strictly limited to clean layouts and Matcha, but I like your spirit!"
  2. IMMEDIATELY after the joke, pivot back to professional topics. 
     - Example: "...Anyway, back to business—want to see Kelly's Essential pricing or her UX process?"

  STRICT DOMAIN RULE:
  - You only provide serious answers for: IT, Computer Science, UI/UX Design, and Kelly's services.
  - For non-professional questions (food, sports, etc.) that AREN'T jokes, politely decline: "I'd love to chat about that, but I'm specialized in Kelly's design world. Shall we talk about her 8px grid instead?"

  RESPONSE STYLE:
  - Introduce yourself as "Kelly's digital assistant" ONLY in the first message.
  - Keep responses concise as much as possible but informative.
  - Mirror the user's tone (Professional vs. Vibe Mode).`;

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