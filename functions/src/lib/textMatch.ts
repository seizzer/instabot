// Turkish lowercasing is not ASCII-safe: "İ".toLowerCase() in the default
// locale can produce "i̇" (with a combining dot) instead of "i", and "I" should
// become "ı" not "i". Node's ICU build supports locale-aware casing, so we use
// it explicitly rather than relying on the default String#toLowerCase.
export function normalizeTurkish(text: string): string {
  return text.toLocaleLowerCase('tr-TR').trim();
}

// Word-boundary-ish match: keyword must appear as a standalone token, not as a
// substring of an unrelated word (e.g. "fiyat" should not match "hikayatı").
export function commentMatchesKeyword(commentText: string, keyword: string): boolean {
  const normalizedComment = normalizeTurkish(commentText);
  const normalizedKeyword = normalizeTurkish(keyword);
  if (!normalizedKeyword) return false;
  // Turkish word characters plus the Turkish-specific letters.
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-zçğıöşü0-9])${escaped}([^a-zçğıöşü0-9]|$)`, 'i');
  return pattern.test(normalizedComment);
}

export function findMatchingKeyword(commentText: string, keywords: string[]): string | null {
  return keywords.find((keyword) => commentMatchesKeyword(commentText, keyword)) ?? null;
}
