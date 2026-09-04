import { parsePolicyMarkdown, type PolicyInline } from "@shared/policy-markdown";
import { Fragment } from "react";

/**
 * Renders a policy body written in the Owner's Markdown subset.
 *
 * Every branch below builds a React element with the text as a *child*, so the
 * text is escaped by React itself. There is no `dangerouslySetInnerHTML` here
 * and there must never be one: that is what makes the page safe no matter what
 * an Owner - or anyone who reached the Owner's account - types into the editor.
 */
function renderInline(parts: PolicyInline[]) {
  return parts.map((part, index) => {
    switch (part.kind) {
      case "bold":
        return <strong key={index} className="font-bold text-j-ink">{part.text}</strong>;
      case "italic":
        return <em key={index}>{part.text}</em>;
      case "link":
        // External links open away from the site; `noreferrer` keeps the
        // opener out of the target's hands.
        return part.href.startsWith("/")
          ? <a key={index} href={part.href} className="font-semibold text-j-accent underline underline-offset-2">{part.text}</a>
          : <a key={index} href={part.href} target="_blank" rel="noreferrer" className="font-semibold text-j-accent underline underline-offset-2">{part.text}</a>;
      default:
        return <Fragment key={index}>{part.text}</Fragment>;
    }
  });
}

export default function PolicyDocument({ body, className }: { body: string; className?: string }) {
  const blocks = parsePolicyMarkdown(body);
  if (blocks.length === 0) return null;

  return <div className={`space-y-5 leading-8 text-[#607b8e] ${className ?? ""}`}>
    {blocks.map((block, index) => {
      if (block.kind === "heading") {
        return block.level === 2
          ? <h2 key={index} className="pt-2 text-xl font-bold text-j-ink">{renderInline(block.content)}</h2>
          : <h3 key={index} className="pt-1 text-base font-bold text-j-ink">{renderInline(block.content)}</h3>;
      }
      if (block.kind === "list") {
        const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>);
        return block.ordered
          ? <ol key={index} className="list-decimal space-y-1 pl-6">{items}</ol>
          : <ul key={index} className="list-disc space-y-1 pl-6">{items}</ul>;
      }
      return <p key={index}>{renderInline(block.content)}</p>;
    })}
  </div>;
}
