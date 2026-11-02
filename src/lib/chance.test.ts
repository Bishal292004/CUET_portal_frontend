import { describe, expect, it } from "vitest";
import { classify, pickCutoff } from "./chance";

describe("admission chance rules (match backend utils/chance.js)", () => {
  it("10+ marks above the cutoff is HIGH", () => expect(classify(10)).toBe("HIGH"));
  it("within 10 marks either side is MODERATE", () => expect(classify(-10)).toBe("MODERATE"));
  it("11 to 30 marks below is LOW", () => expect(classify(-30)).toBe("LOW"));
  it("more than 30 marks below is UNLIKELY", () => expect(classify(-31)).toBe("UNLIKELY"));
  it("falls back to General cutoff, latest year, earliest round", () => {
    const c = pickCutoff(
      [
        { _id: "a", programme: "p", year: 2024, round: 1, category: "GEN", closingScore: 150 },
        { _id: "b", programme: "p", year: 2025, round: 2, category: "GEN", closingScore: 140 },
        { _id: "c", programme: "p", year: 2025, round: 1, category: "GEN", closingScore: 160 },
      ],
      "SC",
    );
    expect(c?._id).toBe("c");
  });
});
