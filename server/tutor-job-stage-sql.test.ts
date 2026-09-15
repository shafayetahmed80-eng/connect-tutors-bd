import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { tutorApplicationStages } from "@shared/tutor-application-stages";
import { tutors } from "../drizzle/schema";
import { tutorJobStageCondition } from "./db";

/**
 * The Tutor Profiles job-stage tabs count and filter with a correlated
 * subquery. Its mistakes cost no error - a bare `id` quietly compares a table
 * with itself - so the compiled text is pinned here. `toSQL()` never opens the
 * connection the pool points at.
 */
const db = drizzle(mysql.createPool({ host: "0.0.0.0", port: 1, user: "unused" }), { mode: "default" });
const compile = (stage: (typeof tutorApplicationStages)[number]["key"]) =>
  db.select({ id: tutors.id }).from(tutors).where(tutorJobStageCondition(stage)).toSQL().sql;

describe("the job-stage subquery", () => {
  it("ties each application to the outer Tutor by full name, and never writes a bare id", () => {
    for (const { key } of tutorApplicationStages) {
      // Only the subquery: the outer `select` is drizzle's own and may be bare.
      const subquery = compile(key).slice(compile(key).indexOf("exists ("));
      expect(subquery, key).toContain("`tutor_job_interests`.`tutorId` = `tutors`.`id`");
      expect(subquery, key).not.toMatch(/[^.]`id`/);
    }
  });

  it("names each stage by the Status tab's own rule", () => {
    expect(compile("applied")).toContain("`tutor_job_interests`.`status` = 'interested'");
    expect(compile("shortlisted")).toContain("`tutor_job_interests`.`status` = 'shortlisted'");
    // Appointed and Confirmed share an interest status; the request's confirmation tells them apart.
    expect(compile("appointed")).toContain("= 'matched' and `tutor_requests`.`appointmentConfirmedAt` is null");
    expect(compile("confirmed")).toContain("= 'matched' and `tutor_requests`.`appointmentConfirmedAt` is not null");
    expect(compile("cancelled")).toContain("`tutor_job_interests`.`status` in ('declined', 'withdrawn')");
  });
});
