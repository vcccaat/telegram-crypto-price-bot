const { requestTokenPriceWs } = require('./request');
const bot = require('./telegramAPI');

module.exports = {
	selectTokenBtn: (chatId) => {
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
		bot.sendMessage(chatId, 'Please select the coin you want to track.', opts);
	},
	selectDirectionBtn: (token, id, chatId) => {
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

		bot.answerCallbackQuery(id).then(() => {
			bot.sendMessage(
				chatId,
				`Target ${token} above or below a certain price?`,
				opts
			);
		});
	},
	inputTargetPrice: (token, direction, id, chatId) => {
		bot.answerCallbackQuery(id).then(() => {
			bot.sendMessage(chatId, `Please input your target price for ${token}.`);

			bot.once('message', (msg, data) => {
				const targetPrice = msg.text;
				// check input is number
				if (isNaN(targetPrice)) {
					bot.sendMessage(msg.chat.id, 'Please input valid number');
					initial();
				} else {
					requestTokenPriceWs(msg.chat.id, token, direction, targetPrice);
				}
			});
		});
	},
};
