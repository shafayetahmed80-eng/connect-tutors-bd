import { describe, expect, it } from "vitest";
import { parsePolicyInline, parsePolicyMarkdown, policyPlainText } from "./policy-markdown";

describe("policy markdown", () => {
  it("joins wrapped lines into one paragraph and separates on a blank line", () => {
    const blocks = parsePolicyMarkdown("First line\nsecond line\n\nA new thought.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: "paragraph", content: [{ kind: "text", text: "First line second line" }] });
    expect(blocks[1]).toMatchObject({ kind: "paragraph" });
  });

  it("reads the two heading levels a policy needs and no more", () => {
    const blocks = parsePolicyMarkdown("## Section\n### Subsection\n#### Too deep");
    expect(blocks[0]).toMatchObject({ kind: "heading", level: 2 });
    expect(blocks[1]).toMatchObject({ kind: "heading", level: 3 });
    // A fourth level is not part of the subset, so it stays visible as text
    // rather than silently disappearing.
    expect(blocks[2]).toMatchObject({ kind: "paragraph", content: [{ kind: "text", text: "#### Too deep" }] });
  });

  it("gathers bullets and numbers into lists, and does not merge the two", () => {
    const blocks = parsePolicyMarkdown("- one\n- two\n1. first\n2. second");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: "list", ordered: false });
    expect((blocks[0] as any).items).toHaveLength(2);
    expect(blocks[1]).toMatchObject({ kind: "list", ordered: true });
  });

  it("reads emphasis and links", () => {
    expect(parsePolicyInline("plain **bold** and *italic*")).toEqual([
      { kind: "text", text: "plain " },
      { kind: "bold", text: "bold" },
      { kind: "text", text: " and " },
      { kind: "italic", text: "italic" },
    ]);
    expect(parsePolicyInline("[Contact us](https://example.com)")).toEqual([
      { kind: "link", text: "Contact us", href: "https://example.com" },
    ]);
  });

  it("keeps an unclosed marker literal instead of swallowing the rest of the line", () => {
    // A forgiving parser would turn everything after the ** into bold. A reader
    // typing a footnote asterisk should not lose their paragraph to it.
    expect(parsePolicyInline("2 ** 3 is eight")).toEqual([{ kind: "text", text: "2 ** 3 is eight" }]);
  });

  it("refuses a script URL but keeps the words the reader was meant to see", () => {
    expect(parsePolicyInline("[Click me](javascript:alert)")).toEqual([{ kind: "text", text: "Click me" }]);
    expect(parsePolicyInline("[Click me](data:text/html,<script>)")).toEqual([{ kind: "text", text: "Click me" }]);

    // A URL containing brackets ends the token early, so a stray character is
    // left behind as text. Harmless, and the scheme is still refused - a link
    // is never produced.
    const withParens = parsePolicyInline("[Click me](javascript:alert(1))");
    expect(withParens.every(part => part.kind === "text")).toBe(true);
    expect(withParens.map(part => part.text).join("")).toBe("Click me)");
    // Case is no disguise.
    expect(parsePolicyInline("[x](JavaScript:alert)")).toEqual([{ kind: "text", text: "x" }]);
  });

  it("allows the schemes a policy actually uses, including relative links", () => {
    for (const href of ["https://example.com", "http://example.com", "mailto:a@b.com", "tel:+8801700000000", "/contact"]) {
      expect(parsePolicyInline(`[x](${href})`)[0]).toMatchObject({ kind: "link", href });
    }
    // Protocol-relative would leave the site for an attacker-chosen host.
    expect(parsePolicyInline("[x](//evil.example)")).toEqual([{ kind: "text", text: "x" }]);
  });

  it("has no way to emit raw HTML, whatever is typed", () => {
    const blocks = parsePolicyMarkdown('<img src=x onerror="alert(1)">\n<script>alert(1)</script>');
    // Every part is a text node. The renderer places it as a string child, so
    // the angle brackets reach the page as characters, not as an element.
    for (const block of blocks) {
      expect(block.kind).toBe("paragraph");
      for (const part of (block as any).content) expect(part.kind).toBe("text");
    }
  });

  it("reads a whole document the way an Owner would write one", () => {
    const blocks = parsePolicyMarkdown(`## সেবার উদ্দেশ্য

Connect Tutors BD একটি প্ল্যাটফর্ম।

### ব্যবহারকারীর দায়িত্ব

- সঠিক তথ্য দেওয়া
- অনুমোদিত ব্যবহার

প্রয়োজনে [যোগাযোগ](/contact) করুন।`);

    expect(blocks.map(b => b.kind)).toEqual(["heading", "paragraph", "heading", "list", "paragraph"]);
    expect((blocks[3] as any).items).toHaveLength(2);
    expect((blocks[4] as any).content).toContainEqual({ kind: "link", text: "যোগাযোগ", href: "/contact" });
  });

  it("gives back plain text for the editor's word count", () => {
    expect(policyPlainText("## Title\n\nSome **bold** words.")).toBe("Title Some bold words.");
  });

  it("returns nothing for an empty document rather than an empty paragraph", () => {
    expect(parsePolicyMarkdown("")).toEqual([]);
    expect(parsePolicyMarkdown("   \n\n  ")).toEqual([]);
  });
});
