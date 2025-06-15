const functions = require('firebase-functions');
const { Configuration, OpenAIApi } = require('openai');

// Firebase 환경설정에서 openai.key 설정 필요
const configuration = new Configuration({
  apiKey: functions.config().openai.key,
});

const openai = new OpenAIApi(configuration);

// HTTP 요청으로 실행되는 Firebase 함수
exports.generateExamples = functions.https.onRequest(async (req, res) => {
  try {
    const prompt = req.body.prompt;

    if (!prompt) {
      res.status(400).send("요청에 prompt가 없습니다.");
      return;
    }

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", // 또는 "gpt-4"
      messages: [
        { role: "system", content: "당신은 목회자의 설교 작성을 도와주는 조력자입니다." },
        { role: "user", content: prompt }
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const result = completion.data.choices[0].message.content.trim();
    res.status(200).json({ result });
  } catch (error) {
    console.error("🔥 AI 호출 오류:", error);
    res.status(500).send("AI 호출 중 오류가 발생했습니다.");
  }
});
