import { parsePolicyMarkdown, type PolicyInline } from "@shared/policy-markdown";
import { Fragment, useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { toast } from "sonner";

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

function PolicyHeading({
  level,
  id,
  content,
  showAnchor = true,
  onHeadingClick,
}: {
  level: 2 | 3;
  id: string;
  content: PolicyInline[];
  showAnchor?: boolean;
  onHeadingClick?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      window.history.replaceState(null, "", `#${id}`);
      setCopied(true);
      toast.success("সেকশন লিংক কপি হয়েছে!");
      onHeadingClick?.(id);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const Tag = level === 2 ? "h2" : "h3";
  const headingStyles = level === 2
    ? "pt-3 pb-1 text-xl sm:text-2xl font-bold text-j-ink"
    : "pt-2 pb-0.5 text-base sm:text-lg font-bold text-j-ink";

  return (
    <Tag
      id={id}
      data-section-id={id}
      className={`group flex scroll-mt-24 items-center justify-between gap-2.5 transition-colors duration-300 ${headingStyles}`}
    >
      <span className="min-w-0">{renderInline(content)}</span>
      {showAnchor ? (
        <button
          type="button"
          onClick={handleCopyLink}
          title="Copy link to this section"
          aria-label={`Copy link to section ${id}`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-80 transition hover:bg-sky-50 hover:text-j-accent focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-j-accent sm:opacity-0 sm:group-hover:opacity-100"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Link2 className="size-4" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </Tag>
  );
}

export type PolicyDocumentProps = {
  body: string;
  className?: string;
  showAnchorLinks?: boolean;
  onHeadingClick?: (id: string) => void;
};

export default function PolicyDocument({
  body,
  className,
  showAnchorLinks = true,
  onHeadingClick,
}: PolicyDocumentProps) {
  const blocks = parsePolicyMarkdown(body);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrollToHash = () => {
      const rawHash = window.location.hash.replace(/^#/, "");
      if (!rawHash) return;
      const decoded = decodeURIComponent(rawHash);
      const element = document.getElementById(decoded) || document.getElementById(rawHash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        element.classList.add("bg-sky-50/80", "rounded-lg", "px-2", "-mx-2");
        setTimeout(() => {
          element.classList.remove("bg-sky-50/80", "rounded-lg", "px-2", "-mx-2");
        }, 2200);
      }
    };

    const timer = setTimeout(scrollToHash, 150);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [body]);

  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-5 leading-8 text-[#607b8e] ${className ?? ""}`}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <PolicyHeading
              key={index}
              level={block.level}
              id={block.id}
              content={block.content}
              showAnchor={showAnchorLinks}
              onHeadingClick={onHeadingClick}
            />
          );
        }
        if (block.kind === "list") {
          const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>);
          return block.ordered
            ? <ol key={index} className="list-decimal space-y-1 pl-6">{items}</ol>
            : <ul key={index} className="list-disc space-y-1 pl-6">{items}</ul>;
        }
        return <p key={index}>{renderInline(block.content)}</p>;
      })}
    </div>
  );
}
