// redis.js
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.UPSTASH_REDIS_WEBSOCKET_URL, {
  tls: {}, // Secure connection
  lazyConnect: false,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    console.log(`🔁 Redis reconnect attempt ${times}, retrying in ${delay}ms...`);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('✅ Connected to Upstash Redis (WebSocket)');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

module.exports = redis;
