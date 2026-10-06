export interface TextBlock {
  code: boolean;
  text: string;
}

const CODE_HINT =
  /(^\s{2,}\S)|[;{}=]\s*$|^\s*(def |class |function |const |let |var |int |public |private |return |import |from |SELECT |UPDATE |INSERT |FROM |WHERE |for |while |if |console\.|print\(|git |docker |kubectl |await |async )/i;

/**
 * Splits question/explanation text into prose and code blocks (same heuristic as the web player):
 * consecutive code-looking lines are grouped so they can be rendered in a monospace box.
 */
export function splitBlocks(text: string): TextBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 1) return [{ code: false, text }];
  const out: TextBlock[] = [];
  for (const line of lines) {
    const isCode = line.trim() !== "" && CODE_HINT.test(line);
    const last = out[out.length - 1];
    if (last && (last.code === isCode || (line.trim() === "" && last.code))) last.text += `\n${line}`;
    else out.push({ code: isCode, text: line });
  }
  return out
    .map((b) => ({ ...b, text: b.code ? b.text.replace(/\n+$/, "") : b.text.trim() }))
    .filter((b) => b.text !== "");
}

/** Splits `inline code` spans out of a prose line. */
export function splitInlineCode(text: string): { code: boolean; text: string }[] {
  return text
    .split(/(`[^`]+`)/g)
    .filter((p) => p !== "")
    .map((p) => (p.length > 2 && p.startsWith("`") && p.endsWith("`") ? { code: true, text: p.slice(1, -1) } : { code: false, text: p }));
}
