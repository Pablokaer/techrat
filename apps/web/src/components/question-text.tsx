import { Fragment } from "react";

/**
 * Renders question / explanation text. Lines that look like code (indented, or containing code punctuation
 * after a blank line) are grouped into a <pre> block; `inline code` gets a mono style. No HTML is ever injected.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = splitBlocks(text);
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.code ? (
          <pre key={i} className="my-3 overflow-x-auto rounded-xl border border-border bg-bg-2 p-4 font-mono text-[13px] leading-6 text-primary/90">
            <code>{b.text}</code>
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap">{inline(b.text)}</p>
        ),
      )}
    </div>
  );
}

function inline(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code key={i} className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-primary/90">{part.slice(1, -1)}</code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const CODE_HINT = /(^\s{2,}\S)|[;{}=]\s*$|^\s*(def |class |function |const |let |var |int |public |private |return |import |from |SELECT |UPDATE |INSERT |FROM |WHERE |for |while |if |console\.|print\(|git |docker |kubectl |await |async )/i;

export function splitBlocks(text: string): { code: boolean; text: string }[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 1) return [{ code: false, text }];
  const out: { code: boolean; text: string }[] = [];
  for (const line of lines) {
    const isCode = line.trim() !== "" && CODE_HINT.test(line);
    const last = out[out.length - 1];
    if (last && (last.code === isCode || (line.trim() === "" && last.code))) last.text += `\n${line}`;
    else out.push({ code: isCode, text: line });
  }
  return out.map((b) => ({ ...b, text: b.code ? b.text.replace(/\n+$/, "") : b.text.trim() })).filter((b) => b.text !== "");
}
