import { describe, expect, it } from "vitest";
import { homeEditorialImages } from "./Home";

describe("homepage editorial imagery", () => {
  it("uses managed Bangladesh-context learning visuals instead of external third-party image hosts", () => {
    expect(homeEditorialImages).toEqual({
      homeLearning: "/manus-storage/connect-tutors-home-learning_1281da6b.jpg",
      onlineLearning: "/manus-storage/connect-tutors-home-online_545114df.jpg",
    });
    expect(Object.values(homeEditorialImages).every((source) => source.startsWith("/manus-storage/"))).toBe(true);
  });
});
