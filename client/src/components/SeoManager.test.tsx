// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { afterEach, describe, expect, it } from "vitest";
import { seoPages, defaultSeoPage } from "@shared/seo";
import SeoManager from "./SeoManager";

afterEach(() => { cleanup(); document.title = ""; });

function mount(path: string) {
  const { hook, navigate } = memoryLocation({ path });
  render(<Router hook={hook}><SeoManager /></Router>);
  return navigate;
}

describe("the tab's title as someone moves around the site", () => {
  it("leaves the first page's title alone, since the server already put the right one there", () => {
    document.title = "A shared tuition's own title";
    mount("/job-board");

    expect(document.title).toBe("A shared tuition's own title");
  });

  it("gives the page someone lands on its own title when what arrived is the site-wide one, as an installed app's saved copy of the page is", () => {
    document.title = defaultSeoPage.title;
    mount("/contact");

    expect(document.title).toBe(seoPages.find(page => page.path === "/contact")?.title);
  });

  it("follows each public page they move to", () => {
    document.title = "start";
    const navigate = mount("/");

    act(() => navigate("/contact"));
    expect(document.title).toBe(seoPages.find(page => page.path === "/contact")?.title);
    act(() => navigate("/become-tutor"));
    expect(document.title).toBe(seoPages.find(page => page.path === "/become-tutor")?.title);
  });

  it("falls back to the site's title for a panel or any page that is not listed", () => {
    const navigate = mount("/contact");

    act(() => navigate("/tutor/dashboard"));
    expect(document.title).toBe(defaultSeoPage.title);
  });
});
