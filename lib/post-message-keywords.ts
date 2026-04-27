/**
 * ต่อท้ายข้อความด้วย keyword / แฮชแท็ก (คั่นด้วยคอมม่าหรือขึ้นบรรทัดใหม่)
 */
export function appendKeywordsToMessage(
  message: string,
  keywordsRaw: string,
): string {
  const parts = keywordsRaw
    .split(/[,，\n\r]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return message.trim();
  }
  const tags = parts.map((p) =>
    p.startsWith("#") ? p : `#${p.replace(/\s+/g, "")}`,
  );
  const tail = tags.join(" ");
  const base = message.trim();
  if (!base) {
    return tail;
  }
  return `${base}\n\n${tail}`;
}
