const express = require('express');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(express.json());

// ✅ [CORS 설정 추가]
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// ✅ OpenAI 설정
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// ✅ AI 라우터
app.post('/api/generateExamples', async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "당신은 설교 작성을 도와주는 AI입니다." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500
    });

    res.json({ result: response.data.choices[0].message.content.trim() });
  } catch (err) {
    console.error("❌ OpenAI error:", err.message);
    res.status(500).json({ error: "AI 오류 발생", detail: err.message });
  }
});

module.exports = app;
