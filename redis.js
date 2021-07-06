const redis = require('redis');
var bluebird = require('bluebird')
require('dotenv').config();

// Promisify all redis methods
bluebird.promisifyAll(redis)

const db = redis.createClient(process.env.REDIS_URL);

module.exports = {
  keys: async (key) => {
    return db.keysAsync(key)
  },
  set: async (key, value) => {
    return db.setAsync(key, value)
  },
  get: async (key) => {
    return db.getAsync(key)
  },
  del: async (key) => {
    db.delAsync(key)
  },
  hkeys: async (hash) => {
    return db.hkeysAsync(hash)
  },
  hset: (hash, field, value) => {
    return db.hset(hash, field, value)
  },
  hget: async (hash, field) => {
    return db.hgetAsync(hash, field)
  },
  hgetall: async (hash) => {
    return db.hgetallAsync(hash)
  },
  hdel: async (hash, field) => {
    return db.hdelAsync(hash, field)
  },
  flushall: () => {
    return db.flushall()
  }
}