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

// express.json() throws on a non-empty-but-invalid JSON body, but
// also throws on a body that's just whitespace or genuinely empty
// while still carrying a "Content-Type: application/json" header —
// e.g. testing tools (Postman, ReqBin, curl with -d '') often send
// exactly this for "no body needed" endpoints like POST /generate.
// verify() lets us treat that specific case as an empty object
// instead of a parse failure, without weakening real validation —
// a body that's actually malformed JSON (like `{oops`) still throws.
app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      if (buf.length === 0 || buf.toString('utf8').trim().length === 0) {
        // Replace the raw buffer with a valid empty object so the
        // underlying JSON.parse() that express.json() runs next
        // succeeds instead of throwing.
        // eslint-disable-next-line no-param-reassign
        req._aiscentraEmptyBody = true;
      }
    },
  })
);

// Patches req.body back to {} for the empty-body case flagged above.
// (verify() runs before parsing completes, so we finish the fix-up here.)
app.use((req, res, next) => {
  if (req._aiscentraEmptyBody && (req.body === undefined || req.body === null)) {
    req.body = {};
  }
  next();
});

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

// Last-resort error handler.
//
// Most errors here are routes' own try/catch surfacing something
// unexpected — but a real, common case is express.json() itself
// throwing because the client sent a body that genuinely isn't valid
// JSON (e.g. `{not valid`). That's a client mistake, not a server
// bug — respond 400, not 500, so callers can tell the difference.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      error: 'Request body is not valid JSON.',
      detail: err.message,
    });
  }

  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Unexpected server error.', detail: err.message });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`AIscentra backend listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
