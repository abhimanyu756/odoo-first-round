const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

// Cookie options shared by access & refresh cookies.
const cookieBase = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  path: '/',
};

const ACCESS_COOKIE = 'af_access';
const REFRESH_COOKIE = 'af_refresh';

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  cookieBase,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
};
