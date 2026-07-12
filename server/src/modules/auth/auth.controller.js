const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  cookieBase,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} = require('../../utils/tokens');

// 15 min / 7 days in ms for cookie maxAge.
const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setAuthCookies(res, user) {
  const payload = { sub: user.id, role: user.role };
  res.cookie(ACCESS_COOKIE, signAccessToken(payload), { ...cookieBase, maxAge: ACCESS_MAX_AGE });
  res.cookie(REFRESH_COOKIE, signRefreshToken(payload), { ...cookieBase, maxAge: REFRESH_MAX_AGE });
}

const signup = asyncHandler(async (req, res) => {
  const user = await authService.signup(req.body);
  setAuthCookies(res, user);
  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  setAuthCookies(res, user);
  res.json({ user });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.json({ user });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = verifyRefreshToken(token);
    const user = await authService.getProfile(decoded.sub);
    setAuthCookies(res, user);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(ACCESS_COOKIE, cookieBase);
  res.clearCookie(REFRESH_COOKIE, cookieBase);
  res.json({ success: true });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  res.json({ message: 'If that email exists, a reset link has been issued.', ...result });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(result);
});

module.exports = { signup, login, me, refresh, logout, forgotPassword, resetPassword };
