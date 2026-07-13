import { GoogleGenerativeAI } from '@google/generative-ai';

const INTENT_TAGS = ['fiyat_sorma', 'sikayet', 'tesekkur', 'genel_soru', 'diger'] as const;
export type IntentTag = (typeof INTENT_TAGS)[number];

export interface ClassifyAndReplyResult {
  intent: IntentTag;
  suggestedReply: string;
}

function buildPrompt(commentText: string, tone: 'samimi' | 'resmi'): string {
  return `Sen küçük bir işletmenin Instagram hesabını yöneten bir asistansın.
Aşağıdaki Instagram yorumunu oku ve şu iki şeyi üret:
1. "intent": yorumun niyeti — şu etiketlerden birini seç: ${INTENT_TAGS.join(', ')}
2. "suggestedReply": yorumu yazan kişiye DM olarak gönderilecek, ${tone === 'samimi' ? 'samimi ve sıcak' : 'resmi ve kurumsal'} bir Türkçe cevap. Kısa (en fazla 2 cümle) ve doğal olsun, emoji kullanılabilir ama abartma.

Yorum: "${commentText}"

Sadece şu JSON formatında cevap ver, başka hiçbir şey yazma:
{"intent": "...", "suggestedReply": "..."}`;
}

let client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export async function classifyAndReply(
  commentText: string,
  tone: 'samimi' | 'resmi'
): Promise<ClassifyAndReplyResult> {
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(buildPrompt(commentText, tone));
  const text = result.response.text();

  let parsed: Partial<ClassifyAndReplyResult>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text}`);
  }

  const intent = INTENT_TAGS.includes(parsed.intent as IntentTag)
    ? (parsed.intent as IntentTag)
    : 'diger';

  return {
    intent,
    suggestedReply: parsed.suggestedReply ?? '',
  };
}
