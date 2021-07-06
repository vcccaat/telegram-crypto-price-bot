
const Binance = require('binance-api-node').default;
require('dotenv').config();

// setup binance API
module.exports = { 
  binanceClient : Binance(),
  binancePersonalClient: // only need for order request
  Binance({
  	apiKey: process.env.BINANCE_API_KEY,
  	apiSecret: process.env.BINANCE_API_SECRET,
  })
}

