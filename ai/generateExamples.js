const express = require('express');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

// ✅ CORS 허용
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// ✅ OpenAI v4 방식 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/generateExamples', async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "당신은 설교 작성을 도와주는 AI입니다." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500
    });

    res.json({ result: chat.choices[0].message.content.trim() });
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    res.status(500).json({ error: "AI 오류 발생", detail: err.message });
  }
});

module.exports = app;
