import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import verifyHandler from './api/verify.js';
import streakHandler from './api/streak.js';
import telegramHandler from './api/telegram.js';
import discordHandler from './api/discord.js';
import autoHandler from './api/auto.js';
import runHandler from './api/run.js';
import cronHandler from './api/cron.js';
import logoutHandler from './api/logout.js';
import accountsHandler from './api/accounts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// === HTTP Request Logger Middleware (Chỉ log các API /api/*) ===
app.use((req, res, next) => {
  // Chỉ ghi log cho các API (/api/*), bỏ qua toàn bộ trang HTML, font, asset tĩnh
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const start = Date.now();
  const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // ANSI Colors cho HTTP Methods
    const methodColors = {
      GET: '\x1b[36m\x1b[1m',    // Cyan bold
      POST: '\x1b[32m\x1b[1m',   // Green bold
      PUT: '\x1b[33m\x1b[1m',    // Yellow bold
      PATCH: '\x1b[33m\x1b[1m',  // Yellow bold
      DELETE: '\x1b[31m\x1b[1m'  // Red bold
    };

    const methodColor = methodColors[req.method] || '\x1b[37m\x1b[1m';
    const methodPad = `[${req.method}]`.padEnd(8, ' ');
    const methodTag = `${methodColor}${methodPad}\x1b[0m`;

    // Màu sắc theo Status Code
    let statusColor = '\x1b[32m'; // Green
    if (status >= 500) statusColor = '\x1b[31m'; // Red
    else if (status >= 400) statusColor = '\x1b[33m'; // Yellow
    else if (status >= 300) statusColor = '\x1b[36m'; // Cyan

    const statusTag = `${statusColor}${status}\x1b[0m`;
    const timeTag = `\x1b[90m${time}\x1b[0m`;
    const durationTag = `\x1b[90m${duration}ms\x1b[0m`;
    const urlStr = `\x1b[1m${req.originalUrl || req.url}\x1b[0m`;

    console.log(`${timeTag} ${methodTag} ${urlStr} ${statusTag} ${durationTag}`);
  });

  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// === Trang HTML Routes ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'terms.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'docs.html'));
});

app.get('/shortcuts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'shortcuts.html'));
});



// Root icon & crawler fallbacks (seamless resolution for external crawlers/devices)
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'assets', 'favicon.ico')));
app.get('/apple-touch-icon.png', (req, res) => res.sendFile(path.join(__dirname, 'public', 'assets', 'apple-touch-icon.png')));
app.get('/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'public', 'assets', 'logo.png')));
app.get('/preview.png', (req, res) => res.sendFile(path.join(__dirname, 'public', 'assets', 'preview.png')));
app.get('/icons/streak.png', (req, res) => res.sendFile(path.join(__dirname, 'public', 'assets', 'streak.png')));
app.get('/sitemap.xml', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sitemap.xml')));
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'public', 'robots.txt')));

// === Các API Handlers trong /api ===
app.all('/api/verify', verifyHandler);
app.all('/api/settings', verifyHandler); // Alias gộp vào verifyHandler
app.all('/api/streak', streakHandler);
app.all('/api/telegram', telegramHandler);
app.all('/api/discord', discordHandler);
app.all('/api/auto', autoHandler);
app.all('/api/run', runHandler);
app.all('/api/cron', cronHandler);
app.all('/api/logout', logoutHandler);
app.all('/api/accounts', accountsHandler);

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`\x1b[32m✔\x1b[0m \x1b[1m[Server]\x1b[0m    Khởi chạy máy chủ thành công\n`);
  console.log(`  \x1b[90m➜\x1b[0m  Local:    \x1b[36mhttp://localhost:${PORT}\x1b[0m\n`);
});

export default app;
