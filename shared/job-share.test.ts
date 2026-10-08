import { describe, expect, it } from "vitest";
import { buildJobShareText, buildJobShareUrl } from "./job-share";

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
