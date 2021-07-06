const express = require('express');
const packageInfo = require('./package.json');
const {selectTokenBtn, selectDirectionBtn, inputTargetPrice} = require('./inlineBtnMessage')
const {
	starter,
	alertRequest,
	checkPriceRequest,
  clearRequest,
  clearallRequest
} = require('./request');
const bot = require('./telegramAPI')
require('dotenv').config();
const TELEGRAMM_BOT_TOKEN = process.env.TELEGRAMM_BOT_TOKEN;

bot.setWebHook(process.env.HEROKU_URL + TELEGRAMM_BOT_TOKEN);

// setup server to receive POST from telegram
const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

app.get('/', (req, res) => {
	res.json({ version: packageInfo.version });
});

app.post(`/${TELEGRAMM_BOT_TOKEN}`, (req, res) => {
	bot.processUpdate(req.body);
	res.sendStatus(200);
});

app.listen(port, () => {
	console.log(`Express server is listening on ${port}`);
});



// match text request
bot.on('message', (msg) => {
	const chatId = msg.chat.id;

	switch (msg.text) {
		case '/start':
			starter(chatId);
			break;
		case '/target':
			selectTokenBtn(chatId);
			break;
		case '/alerts':
			alertRequest(chatId);
			break;
		case '/clearall':
			clearallRequest(chatId);
			break;
		default:
			break;
	}
});


bot.onText(/\/clear (.+)/, async (msg, data) => {
	const chatId = msg.chat.id;
	const [token, direction, price] = data[1].split(' ');
  clearRequest(chatId,token,direction,price)
});


bot.onText(/\/price (.+)/, (msg, data) => {
	const chatId = msg.chat.id;
	const token1 = data[1];
	const token2 = 'USDT';
	checkPriceRequest(chatId, token1, token2);
});


// inline button callback
bot.on('callback_query', (cb) => {
	const content = cb.data;
  const chatId = cb.message.chat.id
  const id = cb.id

	if (content === 'BTC' || content === 'ETH') {
		selectDirectionBtn(content,id,chatId)
	} 
  else if (content.slice(3) === 'above' || content.slice(3) === 'below') {
		const direction = content.slice(3);
		const token = content.slice(0, 3);
    inputTargetPrice(token,direction,id,chatId)

	} 
  else if (content === 'go-back') {
		selectTokenBtn(chatId)
	}
});


