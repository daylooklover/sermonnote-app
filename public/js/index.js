const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ✅ 여기에 실제 발급받은 sk-proj 키 사용 (클라이언트엔 절대 노출 금지)
const openai = new OpenAI({
  apiKey: ""
});

app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt || "설교문을 작성해줘";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    const result = completion?.choices?.[0]?.message?.content || "GPT 응답 없음";
    console.log("✅ GPT 응답:", result);
    res.status(200).json({ result });
  } catch (error) {
    console.error("❌ GPT 오류:", error.message);
    res.status(500).json({ result: "GPT 호출 오류: " + error.message });
  }
});

exports.api = functions.https.onRequest(app);
