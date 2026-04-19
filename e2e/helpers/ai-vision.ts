/**
 * AI Vision helper — uses OpenRouter (google/gemini-2.0-flash-001 for speed/cost)
 * to analyse Playwright screenshots and answer questions about what's on screen.
 *
 * Usage:
 *   const insight = await analyzeScreen(page, 'Does the step catalog show HTTP Request?');
 *   expect(insight.answer).toBe('yes');
 */

import { Page } from '@playwright/test';
import OpenAI from 'openai';

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_E2E_KEY ?? process.env.OPENAI_API_KEY ?? '',
      defaultHeaders: {
        'HTTP-Referer': 'https://localhost:7333',
        'X-Title': 'Lookout E2E Tests',
      },
    });
  }
  return _client;
}

/** Deep reasoning model — use for maturity audits */
export const VISION_MODEL_DEEP = 'google/gemini-2.5-pro-preview-03-25';
/** Fast model — use for quick yes/no presence checks */
export const VISION_MODEL_FAST = 'google/gemini-2.0-flash-001';

const VISION_MODEL = VISION_MODEL_FAST;

export interface VisionResult {
  /** 'yes' | 'no' | free-form answer depending on query */
  answer: string;
  /** Raw reasoning the model produced */
  reasoning: string;
  /** Structured suggestions for improving the feature under test */
  suggestions: string[];
  /** Detected issues / bugs visible on screen */
  issues: string[];
}

/**
 * Take a full-page screenshot and ask the AI a question about it.
 * Returns structured JSON with answer, reasoning, suggestions, issues.
 */
export async function analyzeScreen(page: Page, question: string, model = VISION_MODEL): Promise<VisionResult> {
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  const base64 = screenshotBuffer.toString('base64');

  const systemPrompt = `You are a senior product-quality engineer at a top-tier SaaS company, evaluating a B2B workflow-builder UI called "Lookout".
Your job is to:
1. Carefully examine the screenshot and answer the specific question.
2. Identify visible UX issues, missing elements, or bugs.
3. Suggest concrete, opinionated improvements that would bring this to production quality.

Respond with a JSON code block (\`\`\`json ... \`\`\`) in this exact shape:
{
  "answer": "<specific, direct answer to the question>",
  "reasoning": "<2-4 sentences with specific observations about what you see>",
  "suggestions": ["<actionable improvement>", "<actionable improvement>"],
  "issues": ["<specific visible problem>"]
}

Be specific. Reference actual UI elements you see. Do not be vague.`;

  const response = await getClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64}` },
          },
          {
            type: 'text',
            text: `Question: ${question}`,
          },
        ],
      },
    ],
    max_tokens: 2048,
  });

  const msg = response.choices[0].message as any;
  const raw = msg.content ?? '{}';

  // Extract JSON from fenced code block if present — try all fences
  let jsonStr = raw.trim();
  const fenceMatches = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  if (fenceMatches.length > 0) {
    // Use the last fence match (models sometimes wrap their thinking in a fence first)
    jsonStr = fenceMatches[fenceMatches.length - 1][1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as VisionResult;
    if (!parsed.reasoning && msg.reasoning) {
      parsed.reasoning = (msg.reasoning as string).trim().slice(0, 500);
    }
    // Ensure answer is a string
    if (parsed.answer == null) parsed.answer = '';
    return parsed;
  } catch {
    // Try to extract score from raw text as last resort
    const scoreMatch = raw.match(/"answer"\s*:\s*"?(\d+)"?/);
    if (scoreMatch) {
      return { answer: scoreMatch[1], reasoning: raw.slice(0, 500), suggestions: [], issues: [] };
    }
    // Model returned prose — wrap it
    return { answer: raw.slice(0, 200), reasoning: raw, suggestions: [], issues: [] };
  }
}

/**
 * Capture the current screen state and ask the AI to reason about it,
 * then log suggestions to the test output for developer review.
 */
export async function auditScreen(page: Page, context: string, model = VISION_MODEL): Promise<VisionResult> {
  const result = await analyzeScreen(
    page,
    `Audit this screen for production readiness. Context: ${context}. ` +
    `List all UX issues, missing features, confusing labels, and suggest specific improvements.`,
    model
  );

  if (result.suggestions.length > 0) {
    console.log(`\n🧠 AI Suggestions for "${context}":`);
    result.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }
  if (result.issues.length > 0) {
    console.log(`\n⚠️  AI-detected issues for "${context}":`);
    result.issues.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }

  return result;
}
