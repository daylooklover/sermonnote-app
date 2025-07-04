// server.js
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';

dotenv.config(); // .env 파일에서 환경 변수를 로드합니다.

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // CORS 설정: 모든 출처에서의 요청을 허용 (개발용)
app.use(express.json()); // 요청 본문의 JSON을 파싱합니다.

// OpenAI API 설정
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // .env 파일에서 API 키를 가져옴
});
const openai = new OpenAIApi(configuration);

// 🔹 성경 API 호출 함수 (내부 사용용)
async function fetchBibleVerseInternal(reference, translation = 'korhrv') {
  try {
    const response = await axios.get(`https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`);
    return response.data.text || '';
  } catch (error) {
    console.error("성경 API 호출 오류:", error.message);
    return '';
  }
}

// 🌐 성경 구절을 프런트엔드에 제공하는 엔드포인트
app.get('/api/bible-verse', async (req, res) => {
    const { reference, translation } = req.query; // 쿼리 파라미터로 참조와 번역본 받기

    if (!reference) {
        return res.status(400).json({ error: '성경 구절 참조가 필요합니다.' });
    }

    try {
        const bibleText = await fetchBibleVerseInternal(reference, translation);
        if (bibleText) {
            res.json({ text: bibleText });
        } else {
            res.status(404).json({ error: '성경 구절을 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error("API /api/bible-verse 처리 중 오류:", error);
        res.status(500).json({ error: '성경 구절을 가져오는 중 서버 오류가 발생했습니다.' });
    }
});

// 📝 퀵메모 데이터를 제공하는 엔드포인트 (임시 데이터)
// 실제 환경에서는 데이터베이스에서 가져올 수 있습니다.
const quickmemosData = [
    "요한복음 3장 16절: 하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라",
    "마태복음 6장 33절: 그런즉 너희는 먼저 그의 나라와 그의 의를 구하라 그리하면 이 모든 것을 너희에게 더하시리라",
    "시편 23편: 여호와는 나의 목자시니 내게 부족함이 없으리로다",
    "잠언 3장 5-6절: 너는 마음을 다하여 여호와를 의뢰하고 네 명철을 의지하지 말라. 너는 범사에 그를 인정하라 그리하면 네 길을 지도하시리라.",
    "빌립보서 4장 13절: 내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라",
    "로마서 8장 28절: 우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라"
];

app.get('/api/memos', (req, res) => {
    res.json(quickmemosData);
});


// 🧠 AI 설교 생성 및 주석 달기 요청을 처리하는 메인 API 엔드포인트
app.post('/api/ai-process', async (req, res) => {
  try {
    const { prompt, systemPrompt, bibleReference, translation = 'korhrv' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '프롬프트가 필요합니다.' });
    }

    let finalPrompt = prompt;
    // 성경 참조가 제공되면, 성경 본문을 가져와 프롬프트에 추가
    if (bibleReference) {
        console.log(`AI 프롬프트에 성경 본문 추가: ${bibleReference}`);
        const bibleText = await fetchBibleVerseInternal(bibleReference, translation);
        if (bibleText) {
            finalPrompt = `성경 본문 (${translation.toUpperCase()}): ${bibleReference} - ${bibleText}\n\n${prompt}`;
        } else {
            console.warn(`성경 구절 '${bibleReference}'를 가져오지 못했습니다. 원본 프롬프트로 진행합니다.`);
        }
    }

    const completion = await openai.createChatCompletion({
      model: 'gpt-4o-mini', // 사용할 모델 지정 (gpt-4, gpt-3.5-turbo 등)
      messages: [
        { role: 'system', content: systemPrompt || '당신은 유용한 AI 비서입니다.' },
        { role: 'user', content: finalPrompt }
      ],
      max_tokens: 2000, // AI 응답의 최대 토큰 수 (설교문 길이에 맞게 조절)
      temperature: 0.7, // 창의성 정도
    });

    const result = completion.data.choices[0].message.content;
    res.json({ content: result }); // 클라이언트에 'content' 필드로 결과 전송
  } catch (error) {
    console.error("AI 처리 중 오류 발생:", error.response ? error.response.data : error.message);
    res.status(500).json({
        error: 'AI API 호출 중 오류가 발생했습니다.',
        details: error.response ? error.response.data : error.message
    });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`📘 설교 작성기 백엔드 서버 실행 중: http://localhost:${port}`);
});
