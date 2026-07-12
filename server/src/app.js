const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const env = require('./config/env');
const apiRouter = require('./modules');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files statically.
app.use(`/${env.uploads.dir}`, express.static(path.join(__dirname, '..', env.uploads.dir)));

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
