# Telegram Bot: Crypto Price Alert
This telegram bot can be used to check latest price of a cryptocurrency. User can also set a target price and receive alert message when the price of a token is above/below the target price.

# Try it out!
Try the bot at https://telegram.me/CryptoTargetPriceBot. 

**Usage**

🔹 /price TOKEN   
- Check the latest price, e.g. /price BTC

🔹 /target      
- Follow the instructions to set a price alert for BTC or ETH

🔹 /alerts      
- Display active alerts set by a user

🔹 /clearall
- Clear all active alerts set by a user

🔹 /clear TOKEN DIRECTION PRICE
- Remove a specific alert set by a user, e.g. /clear ETH above 2000


# Features
* Get the latest crypto price on Binance via websocket 
* Apply webhook to listen requests with the update data from telegram, instead of using polling to check for updates every few seconds
* Embed inline callback buttons to make easy bot-user interation with a simple click
* Promisify redis to avoid nested callbacks and make it easier to get the result return from the callback


# How to run
This project requires API keys from [Binance](https://www.binance.com/en/my/settings/api-management) and [Telegram](https://t.me/botfather). 

If you only need  crypto price feed instead of using spot/margin/future trading service of a Binance account, Binance API key is optional. Once you put the API keys in `.env`, install the project dependencies and start the project by following the steps below: 


`npm install` 

`npm start`

