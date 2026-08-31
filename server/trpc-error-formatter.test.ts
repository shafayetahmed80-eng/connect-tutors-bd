import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getZodFieldErrorsFromCause } from "./_core/trpc";

describe("getZodFieldErrorsFromCause", () => {
  it("flattens a failed Zod parse into per-field messages a client can attach to inputs", () => {
    const schema = z.object({
      name: z.string().min(2, "Enter your full name."),
      email: z.string().email("Enter a valid email address."),
    });
    const parsed = schema.safeParse({ name: "A", email: "nope" });
    expect(parsed.success).toBe(false);

    expect(getZodFieldErrorsFromCause(parsed.success ? undefined : parsed.error)).toEqual({
      name: ["Enter your full name."],
      email: ["Enter a valid email address."],
    });
  });

  it("keeps every issue when a single field fails more than one rule", () => {
    const schema = z.object({ password: z.string().min(10, "too short").regex(/\d/, "need a digit") });
    const parsed = schema.safeParse({ password: "abcde" });

    const fieldErrors = getZodFieldErrorsFromCause(parsed.success ? undefined : parsed.error);
    expect(fieldErrors?.password).toEqual(expect.arrayContaining(["too short", "need a digit"]));
  });

  it("buckets a form-wide refinement failure under _form", () => {
    const schema = z.object({ a: z.string() }).refine(() => false, { message: "whole form invalid" });
    const parsed = schema.safeParse({ a: "x" });

    expect(getZodFieldErrorsFromCause(parsed.success ? undefined : parsed.error)?._form).toEqual(["whole form invalid"]);
  });

  it("returns undefined when there is nothing field-shaped to report", () => {
    expect(getZodFieldErrorsFromCause(undefined)).toBeUndefined();
    expect(getZodFieldErrorsFromCause({})).toBeUndefined();
    expect(getZodFieldErrorsFromCause(new Error("boom"))).toBeUndefined();
  });
});
