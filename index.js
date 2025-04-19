const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
app.use(line.middleware(config));

const client = new line.Client(config);

app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result));
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `ギャビだよん☆ 「${event.message.text}」って言ったの確認したよん☆`
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ギャビBot起動中 on ${PORT} port!!`);
});
