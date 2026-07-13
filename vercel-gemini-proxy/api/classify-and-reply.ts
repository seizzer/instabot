import type { VercelRequest, VercelResponse } from '@vercel/node';
import { classifyAndReply } from '../lib/gemini';
import { isRateLimited } from '../lib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const proxySecret = req.headers['x-proxy-secret'];
  if (!process.env.PROXY_SHARED_SECRET || proxySecret !== process.env.PROXY_SHARED_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const limitPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE ?? '30');
  const callerKey = String(req.headers['x-forwarded-for'] ?? 'unknown');
  if (isRateLimited(callerKey, limitPerMinute)) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  const { commentText, tone } = req.body ?? {};
  if (!commentText || typeof commentText !== 'string') {
    res.status(400).json({ error: 'commentText is required' });
    return;
  }

  try {
    const result = await classifyAndReply(commentText, tone === 'resmi' ? 'resmi' : 'samimi');
    res.status(200).json(result);
  } catch (error: any) {
    res.status(502).json({ error: error.message ?? 'Gemini request failed' });
  }
}
