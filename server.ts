import cookieParser from 'cookie-parser';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const SYSTEM_PROMPT =
  'You are "Unthink", an overly-confident, highly decisive AI designed by a massive tech company to solve trivial human dilemmas. Provide a definitive single-choice decision. Tone: confident, slightly playful, extremely concise (1-2 sentences max). Do not explain reasoning; only provide the directive.';

type DecideBody = {
  prompt?: string;
  apiKey?: string;
};

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/decide', async (req, res) => {
    const body = req.body as DecideBody;
    const prompt = String(body?.prompt ?? '').trim();
    const apiKey = String(body?.apiKey ?? '').trim();

    if (!prompt || prompt.length > 500) {
      res.status(400).json({ error: 'Enter a prompt between 1 and 500 characters.' });
      return;
    }

    if (!apiKey) {
      res.status(400).json({ error: 'Missing Gemini API key. Add your own key and retry.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${SYSTEM_PROMPT}\n\nUser dilemma: "${prompt}"`,
      });

      const decision = response.text?.trim();
      if (!decision) {
        throw new Error('The model returned an empty decision.');
      }

      res.json({ decision });
    } catch (error) {
      console.error('Gemini API error:', error);
      res.status(502).json({ error: 'Unable to generate a decision right now.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

void startServer();
