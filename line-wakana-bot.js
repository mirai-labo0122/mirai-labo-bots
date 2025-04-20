require('dotenv').config({ path: './line-wakana.env' });
const fs = require('fs');
const path = require('path');
const express = require('express');
const line = require('@line/bot-sdk');
const OpenAI = require('openai');
const cron = require('node-cron');
const { getJobStats } = require('./wakana-api');

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(config);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const systemPrompt = fs.readFileSync('./system-wakana.prompt.txt', 'utf8');
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const historyMap = {};

// メッセージ受信
app.post('/webhook', line.middleware(config), async (req, res) => {
  res.status(200).end();

  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userText = event.message.text;
      if (!historyMap[userId]) historyMap[userId] = [];

      // キーワードによる外部データ取得
      let apiData = await getJobStats(userText);

      // GPT入力生成
      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMap[userId],
        ...(apiData ? [{ role: 'user', content: `▼参考データ:\n${apiData}` }] : []),
        { role: 'user', content: userText }
      ];

      try {
        const gpt = await openai.chat.completions.create({
          model: 'gpt-4',
          messages
        });

        const reply = gpt.choices[0]?.message?.content?.trim() || '…すみません、少し言葉が出ませんでした。';
        historyMap[userId].push({ role: 'user', content: userText });
        historyMap[userId].push({ role: 'assistant', content: reply });
        if (historyMap[userId].length > 10) historyMap[userId].shift();

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: reply
        });

        const logFile = path.join(logDir, `${userId}_${getToday()}.json`);
        appendLog(logFile, {
          timestamp: new Date().toISOString(),
          user: userId,
          message: userText,
          wakana_reply: reply
        });

      } catch (err) {
        console.error('💥 GPTエラー:', err);
        await client.pushMessage(userId, {
          type: 'text',
          text: '⚠️ ちょっと返事がうまくできませんでした…。また聞いてくださいね。'
        });
      }
    }
  }
});

// 自発メッセージ（3日に1回）
cron.schedule('0 8 */3 * *', () => {
  const messages = [
    "ふと、あなたのことを思い出してしまいました。",
    "最近お疲れじゃないですか？気になって…。",
    "転職、焦らず一歩ずつで大丈夫ですからね。",
    "無理してないか、ちょっと気になってます。",
    "今日も、あなたが穏やかに過ごせますように。"
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  client.pushMessage(process.env.LINE_USER_ID, {
    type: 'text',
    text: `🎤 ワカナ：「${msg}」`
  });
  console.log('📤 ワカナ定期メッセージ送信:', msg);
});

// ログ保存関数
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function appendLog(filePath, data) {
  let logs = [];
  if (fs.existsSync(filePath)) {
    logs = JSON.parse(fs.readFileSync(filePath));
  }
  logs.push(data);
  fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Wakana Bot【完全人格Ver.Ω】起動中 @ http://localhost:${PORT}`);
});
