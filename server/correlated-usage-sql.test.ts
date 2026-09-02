import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { locations, tutors, universities } from "../drizzle/schema";
import { outerId } from "./db";

/**
 * The catalog screens show how many records use a row, and that count decides
 * whether the delete button is offered at all. It is computed with a
 * correlated subquery, and correlated subqueries are easy to get quietly
 * wrong: the mistake costs no error, just a number that is always zero.
 *
 * A pool pointed at nowhere is enough here - `toSQL()` compiles the statement
 * without ever opening a connection.
 */
const db = drizzle(mysql.createPool({ host: "0.0.0.0", port: 1, user: "unused" }), { mode: "default" });

const compile = (chunk: ReturnType<typeof sql>) => db.select({ n: chunk }).from(locations).toSQL().sql;

describe("correlated usage counts", () => {
  it("names the outer table, so the subquery cannot match a row against itself", () => {
    // `tutors` has an `id` of its own, which is exactly the trap.
    expect(compile(sql`(select count(*) from ${tutors} where ${tutors.locationId} = ${outerId(locations)})`))
      .toContain("`locations`.`id`");
  });

  it("still names it when the outer table is a different one", () => {
    expect(outerId(universities)).toBeDefined();
    expect(db.select({ n: sql`(select 1 where 1 = ${outerId(universities)})` }).from(universities).toSQL().sql)
      .toContain("`universities`.`id`");
  });

  it("guards the actual defect: interpolating the column alone renders it bare", () => {
    // Not a claim about how drizzle ought to behave - a record of why outerId
    // exists. Should this ever start emitting `locations`.`id` on its own, the
    // helper is redundant and this test is the place that says so.
    expect(compile(sql`(select count(*) from ${tutors} where ${tutors.locationId} = ${locations.id})`))
      .toContain("= `id`)");
  });
});
