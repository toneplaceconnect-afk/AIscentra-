// server/index.js
//
// AIscentra backend core. One Express service, three logical AI
// roles (research / editor / assistant), tagged per-call in ai_runs.
//
// Run locally:
//   1. cp .env.example .env   (fill in real Supabase + OpenRouter values)
//   2. npm install
//   3. npm start

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const articlesRouter = require('./routes/articles');
const researchRouter = require('./routes/research');
const assistantRouter = require('./routes/assistant');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'aiscentra-backend' });
});

app.use('/api/articles', articlesRouter);
app.use('/api/research', researchRouter);
app.use('/api/assistant', assistantRouter);

// Catch-all 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Last-resort error handler — should rarely fire since routes already
// catch their own errors, but covers anything unexpected (e.g. malformed
// JSON body) before it becomes an unhandled crash.
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`AIscentra backend listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
