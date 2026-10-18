// Local dev stand-in for the Python jobabai-rag-engine service (PRD section 14).
// Returns canned responses so apps/core-api can be built and tested before the
// real service exists. Not used in production.
import express from 'express';

const PORT = Number(process.env.STUB_RAG_ENGINE_PORT ?? 4000);
const INTERNAL_TOKEN = process.env.RAG_ENGINE_INTERNAL_TOKEN ?? 'dev-internal-token';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  if (req.path === '/health') {
    next();
    return;
  }
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Bad internal token' } });
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/embed', (req, res) => {
  const faqEntries = (req.body?.faqEntries as unknown[]) ?? [];
  res.status(200).json({ chunksEmbedded: 1 + faqEntries.length });
});

app.delete('/embed/:productId', (_req, res) => {
  res.status(200).json({ success: true });
});

app.post('/respond', (_req, res) => {
  res.status(200).json({
    reply: 'Thanks for your message! (stub reply)',
    orderIntentDetected: false,
  });
});

app.post('/risk-score', (_req, res) => {
  res.status(200).json({ riskFlags: [], riskScore: 0, explanations: [] });
});

app.listen(PORT, () => {
  console.log(`stub-rag-engine listening on http://localhost:${PORT}`);
});
