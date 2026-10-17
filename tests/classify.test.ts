import { describe, expect, it } from "vitest";
import { classifyIndicators } from "../src/analysis/classify.js";

describe("classifyIndicators", () => {
  it.each([
    [{ hasReadme: true, hasDescription: true, meetsStarThreshold: true }, 3, "P1"],
    [{ hasReadme: true, hasDescription: true, meetsStarThreshold: false }, 2, "P2"],
    [{ hasReadme: true, hasDescription: false, meetsStarThreshold: false }, 1, "P3"],
    [{ hasReadme: false, hasDescription: false, meetsStarThreshold: false }, 0, "P4"],
  ])("classifies indicators", (indicators, qualityScore, priority) => {
    expect(classifyIndicators(indicators)).toEqual({ qualityScore, priority });
  });

  it("keeps the threshold boundary as a satisfied criterion", () => {
    expect(
      classifyIndicators({
        hasReadme: false,
        hasDescription: false,
        meetsStarThreshold: true,
      }),
    ).toEqual({ qualityScore: 1, priority: "P3" });
  });
});
