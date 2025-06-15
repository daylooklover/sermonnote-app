// server.js
import express from 'express';
import cors from 'cors';
import axios from 'axios'; // HTTP 요청을 위한 라이브러리
import { Configuration, OpenAIApi } from 'openai'; // OpenAI 공식 라이브러리
import dotenv from 'dotenv'; // .env 파일에서 환경 변수를 로드하기 위함

// .env 파일 로드 (가장 위에 위치하는 것이 일반적)
dotenv.config();

const app = express();
const port = process.env.PORT || 3000; // 환경 변수 PORT가 없으면 3000번 포트 사용

// 미들웨어 설정
app.use(cors()); // 모든 출처에서의 요청을 허용 (개발용)
app.use(express.json()); // 요청 본문의 JSON을 파싱하기 위함

// OpenAI API 설정
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // .env 파일에서 API 키를 가져옴
});
const openai = new OpenAIApi(configuration);

// 🔹 성경 API 호출 함수 (번역본 선택 가능)
// Bible-API.com을 사용하여 성경 구절을 가져옵니다.
async function fetchBibleVerse(reference, translation = 'korhrv') {
  try {
    // 성경 구절 참조를 URL 인코딩하여 요청
    const response = await axios.get(`https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`);
    // 응답 데이터에서 텍스트를 반환합니다.
    return response.data.text || '';
  } catch (error) {
    // 성경 API 호출 중 오류 발생 시 콘솔에 기록하고 빈 문자열 반환
    console.error("성경 API 호출 오류:", error.message);
    return '';
  }
}

// 퀵메모 데이터를 제공하는 엔드포인트 (임시 데이터)
// 실제 환경에서는 데이터베이스에서 가져와야 합니다.
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


// AI 설교 생성 및 주석 달기 요청을 처리하는 메인 API 엔드포인트
app.post('/api/ai-process', async (req, res) => {
  try {
    // 요청 본문에서 prompt와 translation을 가져옴
    const { prompt, translation = 'korhrv', systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '프롬프트가 필요합니다.' });
    }

    // 🔍 성경 구절 탐지 (다양한 성경책 이름과 장, 절 형식을 감지)
    // 예: 요한복음 3장 16절, 시편 23:1, 창 1:1, 고린도전서 13장 4-7절 등
    const bibleRegex = /(창세기|출애굽기|레위기|민수기|신명기|여호수아|사사기|룻기|사무엘상|사무엘하|열왕기상|열왕기하|역대상|역대하|에스라|느헤미야|에스더|욥기|시편|잠언|전도서|아가|이사야|예레미야|예레미야애가|에스겔|다니엘|호세아|요엘|아모스|오바댜|요나|미가|나훔|하박국|스바냐|학개|스가랴|말라기|마태복음|마가복음|누가복음|요한복음|사도행전|로마서|고린도전서|고린도후서|갈라디아서|에베소서|빌립보서|골로새서|데살로니가전서|데살로니가후서|디모데전서|디모데후서|디도서|빌레몬서|히브리서|야고보서|베드로전서|베드로후서|요한일서|요한이서|요한삼서|유다서|요한계시록)\s*\d+장(?:\s*\d+절)?(?:[,-]?\s*\d*(?:절)?)*/i;

    const match = prompt.match(bibleRegex);

    let fullPrompt = prompt;
    if (match) {
      const verseRef = match[0].trim(); // 감지된 구절 참조
      console.log(`성경 구절 감지: ${verseRef}`);
      const bibleText = await fetchBibleVerse(verseRef, translation);
      if (bibleText) {
        fullPrompt = `성경 본문 (${translation.toUpperCase()}): ${verseRef} - ${bibleText}\n\n${prompt}`;
        console.log(`프롬프트에 성경 본문 추가됨: ${verseRef}`);
      } else {
        console.warn(`성경 구절 '${verseRef}'를 가져오지 못했습니다. 원본 프롬프트로 진행합니다.`);
      }
    }

    // OpenAI Chat Completion 호출
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o-mini', // 사용할 모델 지정 (gpt-4, gpt-3.5-turbo 등)
      messages: [
        { role: 'system', content: systemPrompt || '당신은 유용한 AI 비서입니다.' }, // 시스템 프롬프트 추가
        { role: 'user', content: fullPrompt }
      ],
      max_tokens: 1500, // AI 응답의 최대 토큰 수. 설교문 길이에 따라 조절하세요.
      temperature: 0.7, // 창의성 정도 (0.0은 보수적, 1.0은 매우 창의적)
    });

    const result = completion.data.choices[0].message.content;
    res.json({ content: result }); // 클라이언트에 'content' 필드로 결과 전송
  } catch (error) {
    console.error("AI 처리 중 오류 발생:", error.response ? error.response.data : error.message);
    // 클라이언트에 더 상세한 오류 메시지 전송
    res.status(500).json({
        error: 'AI API 호출 중 오류가 발생했습니다.',
        details: error.response ? error.response.data : error.message
    });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`📘 GPT+성경 번역 선택 서버 실행 중: http://localhost:${port}`);
});
