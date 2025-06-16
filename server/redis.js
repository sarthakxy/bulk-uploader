// server/redis.js
const Redis = require('ioredis');

// Explicitly connect to IPv4 localhost to avoid ::1 (IPv6) issues
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

module.exports = redis;
