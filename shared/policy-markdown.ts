/**
 * The small Markdown subset the Owner writes legal pages in.
 *
 * This is a parser, not a renderer: it produces a tree the client turns into
 * React elements. That is the whole point. Every Markdown library on the shelf
 * emits an HTML string, which would have to be injected with
 * `dangerouslySetInnerHTML` and scrubbed by a sanitiser afterwards - the same
 * trap the notice blocks avoid by rendering as plain text. Producing a typed
 * tree instead means the page can only ever contain the handful of elements
 * listed below, whatever anyone types. There is no path to script injection to
 * close, because none is opened.
 *
 * The subset is deliberately narrow - what a policy document actually needs:
 *
 *   ## Heading          h2
 *   ### Heading         h3
 *   - item              bullet list
 *   1. item             numbered list
 *   **bold**  *italic*  emphasis
 *   [text](url)         link, http/https/mailto/tel only
 *
 * Anything else is text. An unclosed `**` stays two asterisks on the page
 * rather than swallowing the rest of the document, which is what a reader
 * would expect and what a forgiving library would get wrong.
 */

export type PolicyInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "link"; text: string; href: string };

export type PolicyBlock =
  | { kind: "heading"; level: 2 | 3; content: PolicyInline[] }
  | { kind: "paragraph"; content: PolicyInline[] }
  | { kind: "list"; ordered: boolean; items: PolicyInline[][] };

/** Longest a policy body may be. Long enough for a real document, bounded so one cannot be used as storage. */
export const MAX_POLICY_BODY_LENGTH = 40_000;

/**
 * Schemes a link may use. A bare `javascript:` URL is the classic way to smuggle
 * script past a Markdown renderer, so the list is an allowlist rather than a
 * blocklist - anything unrecognised renders as plain text, keeping its label.
 */
const allowedSchemes = ["http://", "https://", "mailto:", "tel:"];

function isAllowedHref(href: string): boolean {
  const trimmed = href.trim();
  // Relative links stay on the site, so they are safe and useful.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  const lowered = trimmed.toLowerCase();
  return allowedSchemes.some(scheme => lowered.startsWith(scheme));
}

const inlinePattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/;

/** Splits one line into text, emphasis and links. Unmatched markers stay literal. */
export function parsePolicyInline(line: string): PolicyInline[] {
  const parts: PolicyInline[] = [];
  let rest = line;

  while (rest.length > 0) {
    const match = inlinePattern.exec(rest);
    if (!match || match.index === undefined) break;

    if (match.index > 0) parts.push({ kind: "text", text: rest.slice(0, match.index) });
    const token = match[0];

    if (token.startsWith("**")) {
      parts.push({ kind: "bold", text: token.slice(2, -2) });
    } else if (token.startsWith("*")) {
      parts.push({ kind: "italic", text: token.slice(1, -1) });
    } else {
      const split = token.indexOf("](");
      const text = token.slice(1, split);
      const href = token.slice(split + 2, -1);
      // A rejected scheme keeps its label rather than vanishing: the reader
      // still sees what the Owner meant to link, just not as a link.
      if (isAllowedHref(href)) parts.push({ kind: "link", text, href: href.trim() });
      else parts.push({ kind: "text", text });
    }

    rest = rest.slice(match.index + token.length);
  }

  if (rest.length > 0) parts.push({ kind: "text", text: rest });
  return parts.length > 0 ? parts : [{ kind: "text", text: "" }];
}

const bulletPattern = /^\s*[-*]\s+(.*)$/;
const numberedPattern = /^\s*\d+[.)]\s+(.*)$/;
const headingPattern = /^(#{2,3})\s+(.*)$/;

/**
 * Turns a policy body into blocks. Consecutive non-blank lines join into one
 * paragraph, the way Markdown has always worked - a line break inside a
 * paragraph is a wrap, not a new thought.
 */
export function parsePolicyMarkdown(source: string): PolicyBlock[] {
  const blocks: PolicyBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", content: parsePolicyInline(paragraph.join(" ").trim()) });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items.map(parsePolicyInline) });
    list = null;
  };
  const flushAll = () => { flushParagraph(); flushList(); };

  for (const line of lines) {
    if (line.trim().length === 0) { flushAll(); continue; }

    const heading = headingPattern.exec(line);
    if (heading) {
      flushAll();
      blocks.push({ kind: "heading", level: heading[1].length === 2 ? 2 : 3, content: parsePolicyInline(heading[2].trim()) });
      continue;
    }

    const bullet = bulletPattern.exec(line);
    const numbered = bullet ? null : numberedPattern.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      // A different marker starts a different list rather than continuing this one.
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1].trim());
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushAll();
  return blocks;
}

/** Plain text of a body, for the "N words" hint in the editor and for search. */
export function policyPlainText(source: string): string {
  return parsePolicyMarkdown(source)
    .flatMap(block => (block.kind === "list" ? block.items : [block.content]))
    .flat()
    .map(part => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
