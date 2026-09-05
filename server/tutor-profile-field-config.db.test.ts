import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { getDb, getTutorProfileFieldConfig, saveTutorProfileFieldOverrides } from "./db";
import { tutorProfileFieldOverrides } from "../drizzle/schema";

const testFieldId = "resultGpa";

async function deleteTestOverride() {
  const database = await getDb();
  if (!database) return;
  await database.delete(tutorProfileFieldOverrides).where(eq(tutorProfileFieldOverrides.fieldId, testFieldId));
}

describe("Tutor Profile field config, against the real database", () => {
  afterEach(deleteTestOverride);

  it("saves an override transactionally and resolves it back", async () => {
    await deleteTestOverride();

    await saveTutorProfileFieldOverrides([
      { fieldId: testFieldId, section: null, subGroup: null, sortOrder: 999, enabled: null, required: 1 },
    ]);

    const config = await getTutorProfileFieldConfig();
    const resolved = config.byId.get(testFieldId);
    expect(resolved?.sortOrder).toBe(999);
    expect(resolved?.required).toBe(true);
    // Untouched axes keep the registry default.
    expect(resolved?.section).toBe("c");
    expect(resolved?.subGroup).toBe("c-education");
  });

  it("upserts on a second save rather than duplicating the row", async () => {
    await saveTutorProfileFieldOverrides([
      { fieldId: testFieldId, section: null, subGroup: null, sortOrder: 1, enabled: null, required: null },
    ]);
    await saveTutorProfileFieldOverrides([
      { fieldId: testFieldId, section: null, subGroup: null, sortOrder: 2, enabled: null, required: null },
    ]);

    const config = await getTutorProfileFieldConfig();
    expect(config.byId.get(testFieldId)?.sortOrder).toBe(2);
  });
});
