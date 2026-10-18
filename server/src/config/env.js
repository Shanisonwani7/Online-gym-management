const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable ${key}. Copy server/.env.example to server/.env and fill it in.`);
  }
}
if (process.env.JWT_SECRET.length < 16) {
  throw new Error('JWT_SECRET must be at least 16 characters long.');
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.startsWith('replace-with')) {
  throw new Error('Set a real JWT_SECRET before running in production.');
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isTest: process.env.NODE_ENV === 'test',
  isProd: process.env.NODE_ENV === 'production',
};
