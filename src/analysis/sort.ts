import type { Priority, RepositoryAnalysis } from "../types/repository.js";

const priorityRank: Record<Priority, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };

export function sortAnalyses(
  repositories: readonly RepositoryAnalysis[],
): RepositoryAnalysis[] {
  return [...repositories].sort((a, b) => {
    const priorityDifference =
      priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDifference !== 0) return priorityDifference;
    if (a.qualityScore !== b.qualityScore)
      return b.qualityScore - a.qualityScore;
    if (a.stars !== b.stars) return b.stars - a.stars;
    const updatedDifference =
      Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
    if (Number.isFinite(updatedDifference) && updatedDifference !== 0) {
      return updatedDifference;
    }
    return a.fullName.localeCompare(b.fullName);
  });
}
