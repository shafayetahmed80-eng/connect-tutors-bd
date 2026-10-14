import { describe, expect, it } from "vitest";
import { buildFacebookShareUrl, buildJobShareText, buildJobShareUrl, buildWhatsAppShareUrl } from "./job-share";

const job = {
  jobId: "6945",
  title: "Need English Medium Tutor for Class 8 Student - 3 Days / Week",
  tuitionType: "home",
  locationLabel: "Mirpur 10, Dhaka",
  budgetAmount: 8000,
};

describe("buildJobShareUrl", () => {
  it("points at the Job Board with the job in the query, the shape a Tutor's sign-in return already uses", () => {
    expect(buildJobShareUrl("https://connecttutorsbd.com", "6945")).toBe("https://connecttutorsbd.com/job-board?job=6945");
  });

  it("does not double the slash when the origin ends with one", () => {
    expect(buildJobShareUrl("https://connecttutorsbd.com/", "6945")).toBe("https://connecttutorsbd.com/job-board?job=6945");
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("creates a valid WhatsApp web share URL with encoded text", () => {
    const text = "Need Tutor\nJob ID: 6945";
    expect(buildWhatsAppShareUrl(text)).toBe("https://api.whatsapp.com/send?text=Need%20Tutor%0AJob%20ID%3A%206945");
  });
});

describe("buildFacebookShareUrl", () => {
  it("creates a valid Facebook sharer URL with encoded URL", () => {
    const url = "https://connecttutorsbd.com/job-board?job=6945";
    expect(buildFacebookShareUrl(url)).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fconnecttutorsbd.com%2Fjob-board%3Fjob%3D6945");
  });
});

describe("buildJobShareText", () => {
  const url = "https://connecttutorsbd.com/job-board?job=6945";

  it("reads headline, place, salary, Job ID, then the link on its own last line", () => {
    expect(buildJobShareText(job, url)).toBe([
      "Need English Medium Tutor for Class 8 Student - 3 Days / Week",
      "Location: Mirpur 10, Dhaka",
      "Salary: 8,000 Taka",
      "Job ID: 6945",
      url,
    ].join("\n"));
  });

  it("leaves the salary out when the Guardian named none", () => {
    expect(buildJobShareText({ ...job, budgetAmount: null }, url)).not.toContain("Salary");
  });

  it("says online for an online tuition and leaves the place out when a home tuition has none", () => {
    expect(buildJobShareText({ ...job, tuitionType: "online", locationLabel: null }, url)).toContain("Location: Online");
    expect(buildJobShareText({ ...job, locationLabel: null }, url)).not.toContain("Location");
  });
});
