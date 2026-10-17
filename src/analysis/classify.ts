import type { Priority, RepositoryAnalysis } from "../types/repository.js";

export interface RepositoryIndicators {
  hasReadme: boolean;
  hasDescription: boolean;
  meetsStarThreshold: boolean;
}

export function classifyIndicators(
  indicators: RepositoryIndicators,
): Pick<RepositoryAnalysis, "qualityScore" | "priority"> {
  const qualityScore = Object.values(indicators).filter(Boolean).length;
  const priorityByScore: Record<number, Priority> = {
    0: "P4",
    1: "P3",
    2: "P2",
    3: "P1",
  };
  return { qualityScore, priority: priorityByScore[qualityScore] };
}
