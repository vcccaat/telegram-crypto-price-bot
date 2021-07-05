const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const Binance = require('binance-api-node').default;
const Agent = require('socks5-https-client/lib/Agent');
const packageInfo = require('./package.json');
const redis = require('redis');
const redisClient = redis.createClient(process.env.REDIS_URL);

require('dotenv').config();

let bot;
const TELEGRAMM_BOT_TOKEN = process.env.TELEGRAMM_BOT_TOKEN;

if (process.env.NODE_ENV === 'prod') {
	bot = new TelegramBot(TELEGRAMM_BOT_TOKEN);
	bot.setWebHook(process.env.HEROKU_URL + TELEGRAMM_BOT_TOKEN);
} else {
	bot = new TelegramBot(TELEGRAMM_BOT_TOKEN, {
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

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());

app.get('/', (req, res) => {
	res.json({ version: packageInfo.version });
});

// receiving updates at the route below
app.post(`/${TELEGRAMM_BOT_TOKEN}`, (req, res) => {
	bot.processUpdate(req.body);
	res.sendStatus(200);
});

app.listen(port, () => {
	console.log(`Express server is listening on ${port}`);
});

// only need for order request
// const binanceClient = Binance({
// 	apiKey: process.env.BINANCE_API_KEY,
// 	apiSecret: process.env.BINANCE_API_SECRET,
// });

const binanceClient = Binance();

const formatMoney = (value, currency = 'USD', locale = 'en-US') => {
	return Intl.NumberFormat(locale, {
		style: 'currency',
		currencyDisplay: 'symbol',
		currency,
	}).format(value);
};

// starter
bot.on('message', (msg) => {
	const chatId = msg.chat.id;

	switch (msg.text) {
		case '/start':
			bot.sendMessage(
				chatId,
				`🔹 /price TOKEN\n
        - To check for the latest price, e.g. /price BTC\n\n🔹 /target\n
        - Follow the instructions to set a price alert for BTC or ETH\n\n🔹 /alerts\n
        - Display active alerts set by a user`
			);
			break;

		case '/target': //set crypto target price
			const opts = {
				reply_markup: JSON.stringify({
					inline_keyboard: [
						[
							{ text: 'BTC', callback_data: 'BTC' },
							{ text: 'ETH', callback_data: 'ETH' },
						],
					],
				}),
			};
			bot.sendMessage(
				chatId,
				'Please select the coin you want to track.',
				opts
			);
			break;
		case '/alerts': //check active alerts
			// let record = ``;

			// for (r of alertsRecord) {
			// 	record += `🔴 Target `;
			// 	for (item of r) {
			// 		record += item + ` `;
			// 	}
			// 	record += `\n\n`;
			// }
			// if (record) {
			// 	bot.sendMessage(chatId, record);
			// }

			redisClient.keys('*', (err, res) => {
        console.log('alerts==',res)
				const alerts = res;
				let record = ``;
				for (i of alerts) {
					redisClient.hgetall(i, (err, res) => {
            console.log('each alert==',res)
						const line =
							`🔴 Alert when ` +
							res['token'] +
							' is ' +
							res['direction'] +
							' $' +
							res['targetPrice'] +
							'\n\n';
						record += line;
					});
				}
				if (record) {
					bot.sendMessage(chatId, record);
				}
			});

		default:
			break;
	}
});

// check current price of a crypto token
bot.onText(/\/price (.+)/, (msg, data) => {
	const chatId = msg.chat.id;
	const cryptoToken1 = data[1];
	const cryptoToken2 = 'USDT';

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

// let alertsRecord = [];

// inline button callback
bot.on('callback_query', (cb) => {
	const content = cb.data;
	const initial = () => {
		const opts = {
			reply_markup: JSON.stringify({
				inline_keyboard: [
					[
						{ text: 'BTC', callback_data: 'BTC' },
						{ text: 'ETH', callback_data: 'ETH' },
					],
				],
			}),
		};
		bot.answerCallbackQuery(cb.id).then(() => {
			bot.sendMessage(
				cb.message.chat.id,
				'Please select the coin you want to track.',
				opts
			);
		});
	};

	if (content === 'BTC' || content === 'ETH') {
		const token = content;
		const opts = {
			reply_markup: JSON.stringify({
				inline_keyboard: [
					[
						{ text: 'Above', callback_data: token + 'above' },
						{ text: 'Below', callback_data: token + 'below' },
					],
					[{ text: 'Go back', callback_data: 'go-back' }],
				],
			}),
		};

		bot.answerCallbackQuery(cb.id).then(() => {
			bot.sendMessage(
				cb.message.chat.id,
				`Target ${token} above or below a certain price?`,
				opts
			);
		});
	} else if (content.slice(3) === 'above' || content.slice(3) === 'below') {
		const direction = content.slice(3);
		const token = content.slice(0, 3);

		bot.answerCallbackQuery(cb.id).then(() => {
			bot.sendMessage(
				cb.message.chat.id,
				`Please input your target price for ${token}.`
			);

			bot.once('message', (msg, data) => {
				const targetPrice = msg.text;
				// check input is number
				if (isNaN(targetPrice)) {
					bot.sendMessage(msg.chat.id, 'Please input valid number');
					initial();
				} else {
					trackTokenPrice(msg.chat.id, token, direction, targetPrice);
					redisClient.hset(
						msg.message.message_id,
						token,
						direction,
						targetPrice
					);
				}
			});
		});
	} else if (content === 'go-back') {
		initial();
	}
});

const trackTokenPrice = (chatId, token, direction, targetPrice) => {
	const numTargetPrice = parseFloat(targetPrice);

	// alertsRecord.push([token, direction, '$' + targetPrice]);
	redisClient.hset(
		token + direction + targetPrice,
		'token',
		token,
		'direction',
		direction,
		'targetPrice',
		targetPrice,
		(err, res) => {
			const sentence =
				'🚨 Alert when ' + token + ' is ' + direction + ' $' + targetPrice;
			bot.sendMessage(chatId, sentence);
      
		}
	);

	const ticker = token + 'USDT';
	// once the price reach target, cancel the alert afterwards
	let receiveWs = true;

	binanceClient.ws.trades(ticker, (data) => {
		const price = parseFloat(data.price);

		if (receiveWs && direction === 'above' && price > numTargetPrice) {
			receiveWs = false;
			bot.sendMessage(chatId, `🚀 ${ticker} is above $ ${targetPrice}!`);
			//
			// alertsRecord = alertsRecord.filter((record) => {
			// 	return record[0] !== token;
			// });
			//
			redisClient.del(token + 'above' + data.price);
		} else if (receiveWs && direction === 'below' && price < numTargetPrice) {
			receiveWs = false;
			bot.sendMessage(chatId, `🔻️ ${ticker} is below $ ${targetPrice}!`);
			//
			// alertsRecord = alertsRecord.filter((record) => {
			// 	return record[0] !== token;
			// });
			//
			redisClient.del(token + 'below' + data.price);
		}
	});
};
