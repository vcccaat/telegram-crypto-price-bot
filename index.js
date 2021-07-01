const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Binance = require('binance-api-node');
const Agent = require('socks5-https-client/lib/Agent');
const WebSocket = require('ws');

require('dotenv').config();
const ws = new WebSocket(`wss://stream.binance.com:9443/ws`);

const app = express();
app.listen(process.env.PORT);

const binanceClient = Binance.default({
	apiKey: process.env.BINANCE_API_KEY,
	apiSecret: process.env.BINANCE_API_SECRET,
});

let bot;
if (process.env.NODE_ENV === 'prod') {
	bot = new TelegramBot(process.env.TELEGRAMM_BOT_TOKEN);
	bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
	bot = new TelegramBot(process.env.TELEGRAMM_BOT_TOKEN, {
		polling: true,
		request: {
			agentClass: Agent,
			agentOptions: {
				socksHost: process.env.PROXY_SOCKS5_HOST,
				socksPort: parseInt(process.env.PROXY_SOCKS5_PORT),
			},
		},
	});
}

const formatMoney = (value, currency = 'USD', locale = 'en-US') => {
	return Intl.NumberFormat(locale, {
		style: 'currency',
		currencyDisplay: 'symbol',
		currency,
	}).format(value);
};

let tokenTarget = {};

// telegram bot
bot.on('message', (msg) => {
	const chatId = msg.chat.id;

	switch (msg.text) {
		case '/start':
			bot.sendMessage(chatId, 'Yoo!');
			break;

		default:
			break;
	}
});

bot.onText(/\/price (.+)/, (msg, data) => {
	const chatId = msg.chat.id;
	const cryptoToken1 = data[1];
	const cryptoToken2 = 'USDT';

	bot.sendMessage(chatId, 'Wait...');

	binanceClient
		.avgPrice({ symbol: `${cryptoToken1}${cryptoToken2}`.toUpperCase() }) // example, { symbol: "BTCUSTD" }
		.then((avgPrice) => {
			bot.sendMessage(chatId, formatMoney(avgPrice['price']));
		})
		.catch((error) =>
			bot.sendMessage(
				chatId,
				`Error retrieving the price for ${cryptoToken1}${cryptoToken2}: ${error}`
			)
		);
});

let globalChatId
bot.onText(/\/target (.+)/, (msg, data) => {
	const chatId = msg.chat.id;
  globalChatId = chatId
	const [token, direction, targetPrice] = data[1].split(' ');
	const tokenSymbol = token.toLowerCase();
	const sentence =
		'Done. This bot will send price alert when ' +
		tokenSymbol.toUpperCase() +
		' ' +
		direction +
		' $' +
		targetPrice;
	bot.sendMessage(chatId, sentence);

	tokenTarget[tokenSymbol] = [direction, targetPrice];

  const ticker = tokenSymbol + 'usdt@trade';
  const wsMsg = {
    method: 'SUBSCRIBE',
    params: [ticker],
    id: 1,
  };
  ws.onopen = () =>{
    ws.send(JSON.stringify(wsMsg));
  }

  

});

app.post('/' + bot.token, (req, res) => {
	bot.processUpdate(req.body);
	res.sendStatus(200);
});



ws.on('message', (data) => {
	if (data) {
		const result = JSON.parse(data);
		const price = result.p;
		const wsToken = result.s;

		for (token in tokenTarget) {
			const direction = target[token][0];
			const targetPrice = target[token][1];

			if (wsToken === token) {
				if (direction == 'above' && price > targetPrice) {
					bot.sendMessage(globalChatId, `🚀 ${token} price is above ${targetPrice}!`);
					delete tokenTarget[token];
				} else if ((direction = 'below' && price < targetPrice)) {
					bot.sendMessage(
						globalChatId,
						`🔻️ ${token} price is below ${targetPrice}!`
					);
					delete tokenTarget[token];
				}
			}
		}
	}
});
