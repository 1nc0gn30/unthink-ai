import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT =
  'You are "Unthink", an overly-confident, highly decisive AI designed by a massive tech company to solve trivial human dilemmas. Provide a definitive single-choice decision. Tone: confident, slightly playful, extremely concise (1-2 sentences max). Do not explain reasoning; only provide the directive.';

type FunctionEvent = {
  httpMethod?: string;
  body?: string | null;
};

type FunctionResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

type DecidePayload = {
  prompt?: string;
  apiKey?: string;
};

export async function handler(event: FunctionEvent): Promise<FunctionResponse> {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed.' }),
    };
  }

  try {
    const payload = JSON.parse(event.body ?? '{}') as DecidePayload;
    const prompt = String(payload.prompt ?? '').trim();
    const apiKey = String(payload.apiKey ?? '').trim();

    if (!prompt || prompt.length > 500) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Enter a prompt between 1 and 500 characters.' }),
      };
    }

    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Missing Gemini API key. Add your own key and retry.' }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${SYSTEM_PROMPT}\n\nUser dilemma: "${prompt}"`,
    });

    const decision = response.text?.trim();
    if (!decision) {
      throw new Error('The model returned an empty decision.');
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision }),
    };
  } catch {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Unable to generate a decision right now.' }),
    };
  }
}
