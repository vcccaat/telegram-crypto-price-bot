const TelegramBot = require('node-telegram-bot-api');
const Agent = require('socks5-https-client/lib/Agent');
require('dotenv').config();

const TELEGRAMM_BOT_TOKEN = process.env.TELEGRAMM_BOT_TOKEN;


// setup webhook on telegram
let bot;
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
module.exports = bot