const functions = require("firebase-functions");
const { OpenAI } = require("openai");
const cors = require("cors")({ origin: true });

const openai = new OpenAI({
  apiKey: "AIzaSyDuF64w0S6ZcoXAuhtahlUAhCgAYnOFBXo"
});

exports.api = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { prompt, role } = req.body;

    if (!prompt || !role) {
      return res.status(400).json({ error: "❗ prompt와 role은 반드시 포함되어야 합니다." });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: `${role}로서 대답해줘.` },
          { role: "user", content: prompt }
        ]
      });

      // ✅ 응답 전체 구조를 확인하기 위한 디버깅 로그
      console.log("🔥 OpenAI 응답 전체:", JSON.stringify(completion, null, 2));

      const result = completion.choices?.[0]?.message?.content;

      if (!result) {
        console.error("⚠️ GPT 응답이 비어 있음 또는 잘못된 형식입니다.");
        return res.status(500).json({ error: "GPT 응답에서 결과를 찾을 수 없습니다." });
      }

      res.json({ result });
    } catch (err) {
      console.error("🔥 OpenAI 호출 실패:", err);
      res.status(500).json({ error: "❌ OpenAI 호출 실패: " + err.message });
    }
  });
});
