import { describe, expect, it, vi } from "vitest";
import { shareJob, type ShareEnvironment } from "./shareJob";

const job = { jobId: "6945", title: "Need Math Tutor for Class 8 Student - 3 Days / Week", tuitionType: "home", locationLabel: "Mirpur 10, Dhaka", budgetAmount: 8000 };

function environment(over: Partial<ShareEnvironment> = {}): ShareEnvironment {
  return { origin: "https://connecttutorsbd.com", prefersShareSheet: false, copy: vi.fn().mockResolvedValue(true), ...over };
}

describe("shareJob", () => {
  it("opens the share sheet on a phone, with the whole message in it", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const copy = vi.fn();

    const outcome = await shareJob(job, environment({ prefersShareSheet: true, share, copy }));

    expect(outcome).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: job.title, text: expect.stringContaining("https://connecttutorsbd.com/job-board?job=6945") });
    expect(copy).not.toHaveBeenCalled();
  });

  it("copies the same message on a laptop, even when the browser could open a sheet", async () => {
    const share = vi.fn();
    const copy = vi.fn().mockResolvedValue(true);

    const outcome = await shareJob(job, environment({ prefersShareSheet: false, share, copy }));

    expect(outcome).toBe("copied");
    expect(share).not.toHaveBeenCalled();
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("Job ID: 6945"));
  });

  it("treats backing out of the share sheet as nothing happening, not as a failure", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    const copy = vi.fn();

    expect(await shareJob(job, environment({ prefersShareSheet: true, share, copy }))).toBe("cancelled");
    expect(copy).not.toHaveBeenCalled();
  });

  it("falls back to copying when the share sheet breaks for any other reason", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    const copy = vi.fn().mockResolvedValue(true);

    expect(await shareJob(job, environment({ prefersShareSheet: true, share, copy }))).toBe("copied");
  });

  it("reports a copy that did not work", async () => {
    expect(await shareJob(job, environment({ copy: vi.fn().mockResolvedValue(false) }))).toBe("failed");
  });
});
