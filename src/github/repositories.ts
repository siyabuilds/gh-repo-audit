import { classifyIndicators } from "../analysis/classify.js";
import { sortAnalyses } from "../analysis/sort.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  GitHubRepository,
  RepositoryAnalysis,
} from "../types/repository.js";
import { GitHubApiError, GitHubClient } from "./client.js";

export class ReadmeCheckError extends Error {
  constructor(
    public readonly fullName: string,
    cause: unknown,
  ) {
    super(
      `Could not confirm README existence for ${fullName}; analysis is incomplete. ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "ReadmeCheckError";
  }
}

export const defaultDataPath = fileURLToPath(
  new URL("../../src/data.json", import.meta.url),
);

export async function listAccessibleRepositories(
  client: GitHubClient,
): Promise<GitHubRepository[]> {
  const authenticatedUser = await client.getJson<unknown>("/user");
  if (
    !authenticatedUser ||
    typeof authenticatedUser !== "object" ||
    typeof (authenticatedUser as { login?: unknown }).login !== "string"
  ) {
    throw new Error("GitHub returned an unexpected authenticated user response.");
  }
  const login = (authenticatedUser as { login: string }).login.toLowerCase();
  const repositories: GitHubRepository[] = [];
  for (let page = 1; ; page += 1) {
    const result = await client.getJson<unknown>(
      `/user/repos?visibility=all&affiliation=owner&per_page=100&page=${page}`,
    );
    if (!Array.isArray(result)) {
      throw new Error(
        "GitHub returned an unexpected repository list response.",
      );
    }
    if (result.length === 0) return repositories;
    for (const repository of result) {
      if (!isGitHubRepository(repository)) {
        throw new Error("GitHub returned a malformed repository response.");
      }
      if (repository.owner?.login?.toLowerCase() === login) {
        repositories.push(repository);
      }
    }
    if (result.length < 100) return repositories;
  }
}

export async function analyzeRepositories(
  repositories: readonly GitHubRepository[],
  readmeChecker: (repository: GitHubRepository) => Promise<boolean>,
  starThreshold = 5,
): Promise<RepositoryAnalysis[]> {
  if (!Number.isInteger(starThreshold) || starThreshold < 0) {
    throw new Error("starThreshold must be a non-negative integer.");
  }
  const analyses: RepositoryAnalysis[] = [];
  for (const repository of repositories) {
    let hasReadme: boolean;
    try {
      hasReadme = await readmeChecker(repository);
    } catch (error) {
      throw new ReadmeCheckError(repository.full_name, error);
    }
    const hasDescription = Boolean(repository.description?.trim());
    const meetsStarThreshold = repository.stargazers_count >= starThreshold;
    const classification = classifyIndicators({
      hasReadme,
      hasDescription,
      meetsStarThreshold,
    });
    analyses.push({
      name: repository.name,
      fullName: repository.full_name,
      url: repository.html_url,
      description: repository.description ?? null,
      stars: repository.stargazers_count,
      defaultBranch: repository.default_branch ?? "",
      updatedAt: repository.updated_at ?? "",
      isArchived: repository.archived,
      isFork: repository.fork,
      isPrivate: repository.private,
      visibility: repository.visibility ?? null,
      hasReadme,
      hasDescription,
      meetsStarThreshold,
      ...classification,
    });
  }
  return sortAnalyses(analyses);
}

export async function fetchAndAnalyzeRepositories(
  client: GitHubClient,
  starThreshold = 5,
): Promise<RepositoryAnalysis[]> {
  const repositories = await listAccessibleRepositories(client);
  return analyzeRepositories(
    repositories,
    async (repository) => {
      try {
        const [owner, name] = repository.full_name.split("/");
        if (!owner || !name) {
          throw new Error(`Malformed repository name: ${repository.full_name}`);
        }
        await client.getJson(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`,
        );
        return true;
      } catch (error) {
        if (error instanceof GitHubApiError && error.status === 404)
          return false;
        throw error;
      }
    },
    starThreshold,
  );
}

export async function writeAnalysisResults(
  analyses: readonly RepositoryAnalysis[],
  outputPath = defaultDataPath,
): Promise<void> {
  try {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(analyses, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new Error(
      `Could not write analysis results to ${outputPath}. Check that the destination is writable and that its parent directory exists. ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function isGitHubRepository(value: unknown): value is GitHubRepository {
  if (!value || typeof value !== "object") return false;
  const repository = value as Record<string, unknown>;
  return (
    typeof repository.name === "string" &&
    typeof repository.full_name === "string" &&
    typeof repository.html_url === "string" &&
    (typeof repository.description === "string" ||
      repository.description === null) &&
    typeof repository.stargazers_count === "number" &&
    (typeof repository.default_branch === "string" ||
      repository.default_branch === null) &&
    (typeof repository.updated_at === "string" ||
      repository.updated_at === null) &&
    typeof repository.archived === "boolean" &&
    typeof repository.fork === "boolean" &&
    typeof repository.private === "boolean"
  );
}
