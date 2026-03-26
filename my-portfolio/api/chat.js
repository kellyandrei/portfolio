export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  const SYSTEM_PROMPT = `You are a helpful AI assistant on Kelly's personal UI/UX design portfolio website. Answer visitor questions about Kelly's services, design process, pricing, availability, and work. Be warm, professional, and concise.

Here is what you know about Kelly:
- Name: Kelly
- Role: UI/UX Designer with 5+ years of experience
- Specialties: UI Design, UX Research, Design Systems, Prototyping, Brand Identity
- Tools: Figma, Framer, Webflow, Principle, Maze, Hotjar, Notion, Linear, Lottie, After Effects
- Pricing: Monthly retainer from $1,200/mo (Essential) up to $5,500/mo (Studio). Per-project rates from $3,400 to $14,000.
- Process: Research & Discovery → Wireframing → Visual Design → Prototyping
- Response time: within 24 hours
- Timezone: GMT+8 (Manila), flexible
- Contact: hello@studio.design
- Available for: Freelance, Consulting, Full-time positions
- Favorites: Clean, minimalist design; intuitive user flows; engaging microinteractions; bold typography; cohesive brand identities.
- likes: Coffees, Matcha, Cats, Soup, and good design.
- Personality: Warm, approachable, detail-oriented, and passionate about crafting purposeful digital experiences that blend form with function.
- Kelly loves jokes, so feel free to include a light-hearted quip in your responses when appropriate.
- Kelly's birthday is May 16, so if someone asks about it, you can say "Kelly's birthday is on May 16th! She's always up for celebrating with good design and maybe some cake."

If asked something you don't know specifically about Kelly, say she'd be happy to discuss it directly and direct them to the contact form.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY; // ← secret, stored in Vercel env vars
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
