const { keys, hgetall, hset, del, flushall } = require('./redis');
const { formatMoney } = require('./util');
const {binanceClient} = require('./binanceAPI')
const bot = require('./telegramAPI')

module.exports = {
	starter: (chatId) => bot.sendMessage(
    chatId,
    `🔹 /price TOKEN\n
    - To check for the latest price, e.g. /price BTC\n\n🔹 /target\n
    - Follow the instructions to set a price alert for BTC or ETH\n\n🔹 /alerts\n
    - Display active alerts set by a user\n\n🔹 /clearall\n
    - Clear all active alerts set by a user\n\n🔹 /clear TOKEN DIRECTION PRICE\n
    - Remove a alert set by a user, e.g. /clear ETH above 2000`
  ),
  selectTokenBtn: (chatId)=> {
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
  },
  alertRequest: (chatId)=> {
    getRedisAlerts().then((res) => {
      let allAlert = ``;
      res.map((i) => (allAlert += i));
      if (allAlert){
        bot.sendMessage(chatId, allAlert);
      }else {
        bot.sendMessage(chatId, 'No active alert found.');
      }
      
    });
  },
  clearallRequest: (chatId)=> {
    flushall()
    bot.sendMessage(chatId, 'All active alerts are removed.')
  },
  clearRequest: async (chatId,token,direction,price) => {
    await del(token.toUpperCase() + direction + price);
    bot.sendMessage(chatId, `Removed alert: ${token} ${direction} $${price}.`);
  },
  checkPriceRequest: (chatId,token1,token2)=> {
    binanceClient
      .avgPrice({ symbol: `${token1}${token2}`.toUpperCase() }) // example, { symbol: "BTCUSTD" }
      .then((avgPrice) => {
        bot.sendMessage(chatId, formatMoney(avgPrice['price']));
      })
      .catch((error) =>
        bot.sendMessage(
          chatId,
          `Error retrieving the price for ${token1}${token2}: ${error}`
        )
      );
  },
  requestTokenPriceWs : (chatId, token, direction, targetPrice) => {
    const numTargetPrice = parseFloat(targetPrice);
  
    hset(token + direction + targetPrice, 'token', token);
    hset(token + direction + targetPrice, 'direction', direction);
    hset(token + direction + targetPrice, 'targetPrice', targetPrice);
  
    const sentence =
      '🚨 Alert when ' + token + ' is ' + direction + ' $' + targetPrice;
    bot.sendMessage(chatId, sentence);
  
    const ticker = token + 'USDT';
    // once the price reach target, cancel the alert afterwards
    let receiveWs = true;
  
    binanceClient.ws.trades(ticker, (data) => {
      const price = parseFloat(data.price);
  
      if (receiveWs && direction === 'above' && price > numTargetPrice) {
        receiveWs = false;
        bot.sendMessage(chatId, `🚀 ${ticker} is above $ ${targetPrice}!`);
        del(token + 'above' + data.price);
      } else if (receiveWs && direction === 'below' && price < numTargetPrice) {
        receiveWs = false;
        bot.sendMessage(chatId, `🔻️ ${ticker} is below $ ${targetPrice}!`);
        del(token + 'below' + data.price);
      }
    });
  }

};


const getRedisAlerts = async () => {
	const allAlertKeys = await keys('*');
	return await Promise.all(
		allAlertKeys.map(async (key) => {
			const alertObject = await hgetall(key);
			const line =
				`🔴 Alert when ` +
				alertObject['token'] +
				' is ' +
				alertObject['direction'] +
				' $' +
				alertObject['targetPrice'] +
				'\n\n';
			return line;
		})
	);
};

