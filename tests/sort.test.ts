import { describe, expect, it } from "vitest";
import { sortAnalyses } from "../src/analysis/sort.js";
import type { RepositoryAnalysis } from "../src/types/repository.js";

const repository = (
  fullName: string,
  priority: RepositoryAnalysis["priority"],
  stars: number,
  updatedAt: string,
): RepositoryAnalysis => ({
  name: fullName.split("/")[1],
  fullName,
  url: `https://github.com/${fullName}`,
  description: null,
  stars,
  defaultBranch: "main",
  updatedAt,
  isArchived: false,
  isFork: false,
  isPrivate: false,
  visibility: "public",
  hasReadme: false,
  hasDescription: false,
  meetsStarThreshold: false,
  qualityScore: Number(priority.slice(1)) === 4 ? 0 : Number(priority.slice(1)),
  priority,
});

describe("sortAnalyses", () => {
  it("sorts by priority, stars, update date, then full name", () => {
    const input = [
      repository("zeta/repo", "P2", 10, "2025-01-01T00:00:00Z"),
      repository("org/zeta", "P1", 1, "2020-01-01T00:00:00Z"),
      repository("org/alpha", "P1", 1, "2020-01-01T00:00:00Z"),
      repository("org/newer", "P2", 10, "2026-01-01T00:00:00Z"),
      repository("org/low", "P4", 100, "2026-01-01T00:00:00Z"),
    ];
    const sorted = sortAnalyses(input);
    expect(sorted.map(({ fullName }) => fullName)).toEqual([
      "org/alpha",
      "org/zeta",
      "org/newer",
      "zeta/repo",
      "org/low",
    ]);
    expect(input[0].fullName).toBe("zeta/repo");
  });

  it("returns an empty array for an empty collection", () => {
    expect(sortAnalyses([])).toEqual([]);
  });
});
