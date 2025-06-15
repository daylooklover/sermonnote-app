import OpenAI from 'openai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    res.status(200).json({ result: completion.choices[0].message.content });

  } catch (error) {
    console.error('OpenAI API call failed:', error);

    if (error.response) {
      console.error('OpenAI API Error Response:', error.response);
      return res.status(error.response.status).json({
        error: 'OpenAI API Error',
        details: error.response.data,
      });
    } else {
      return res.status(500).json({
        error: 'Internal Server Error',
        details: error.message,
      });
    }
  }
}
