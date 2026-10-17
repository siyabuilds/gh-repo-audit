import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeRepositories,
  fetchAndAnalyzeRepositories,
  listAccessibleRepositories,
  ReadmeCheckError,
  writeAnalysisResults,
} from "../src/github/repositories.js";
import { GitHubApiError, GitHubClient } from "../src/github/client.js";
import type { GitHubRepository } from "../src/types/repository.js";

const repo = (
  name: string,
  stars = 5,
  owner = "owner",
  isPrivate = false,
): GitHubRepository => ({
  name,
  full_name: `${owner}/${name}`,
  html_url: `https://github.com/${owner}/${name}`,
  description: "An About description",
  stargazers_count: stars,
  default_branch: "main",
  updated_at: "2026-01-01T00:00:00Z",
  archived: false,
  fork: false,
  private: isPrivate,
  owner: { login: owner, type: "User" },
});

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("repository analysis", () => {
  it("normalizes fields, handles missing metadata, and sorts results", async () => {
    const first = repo("first", 4);
    first.description = null;
    const second = repo("second", 5);
    const result = await analyzeRepositories([first, second], async (item) => item.name === "second");
    expect(result[0]).toMatchObject({
      fullName: "owner/second",
      hasReadme: true,
      hasDescription: true,
      meetsStarThreshold: true,
      qualityScore: 3,
      priority: "P1",
    });
    expect(result[1]).toMatchObject({
      hasReadme: false,
      hasDescription: false,
      meetsStarThreshold: false,
      qualityScore: 0,
      priority: "P4",
    });
  });

  it("does not present a failed README request as a missing README", async () => {
    await expect(
      analyzeRepositories([repo("broken")], async () => {
        throw new Error("network down");
      }),
    ).rejects.toBeInstanceOf(ReadmeCheckError);
  });
});

describe("GitHub repository retrieval", () => {
  it("includes only personally owned public and private repositories", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) return Response.json({ login: "Owner" });
      if (url.includes("/user/repos")) {
        expect(new URL(url).searchParams.get("affiliation")).toBe("owner");
        return Response.json([
          repo("public", 1, "owner"),
          repo("private", 2, "owner", true),
          repo("organization", 3, "acme"),
          repo("other-user", 4, "someone-else"),
        ]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const repositories = await listAccessibleRepositories(
      new GitHubClient("test-token", { fetchImpl }),
    );

    expect(repositories.map((item) => item.full_name)).toEqual([
      "owner/public",
      "owner/private",
    ]);
  });

  it("retrieves all pages and treats only README 404 as missing", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => repo(`repo-${index}`));
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      const page = new URL(url).searchParams.get("page");
      if (url.endsWith("/user")) return Response.json({ login: "owner" });
      if (page === "1") return Response.json(firstPage);
      if (page === "2") return Response.json([repo("last")]);
      if (url.includes("/readme")) return Response.json({ name: "README.md" });
      throw new Error(`Unexpected request: ${url}`);
    });
    const client = new GitHubClient("test-token", { fetchImpl });
    expect((await listAccessibleRepositories(client)).length).toBe(101);
    const result = await fetchAndAnalyzeRepositories(client);
    expect(result).toHaveLength(101);
  });

  it("propagates README API failures instead of treating them as absent", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) return Response.json({ login: "owner" });
      if (url.includes("/user/repos")) return Response.json([repo("broken")]);
      return new Response("rate limited", { status: 429 });
    });
    const client = new GitHubClient("test-token", { fetchImpl, maxRetries: 0 });
    await expect(fetchAndAnalyzeRepositories(client)).rejects.toThrow(ReadmeCheckError);
  });

  it("maps a README 404 to a confirmed missing README", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) return Response.json({ login: "owner" });
      if (url.includes("/user/repos")) return Response.json([repo("no-readme")]);
      throw new GitHubApiError("not found", 404, url);
    });
    const result = await fetchAndAnalyzeRepositories(
      new GitHubClient("test-token", { fetchImpl, maxRetries: 0 }),
    );
    expect(result[0].hasReadme).toBe(false);
  });
});

describe("analysis result persistence", () => {
  it("replaces existing content with formatted JSON, including an empty result", async () => {
    const directory = await mkdtemp(join(tmpdir(), "gh-analyzet-"));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, "nested", "data.json");
    await writeAnalysisResults([{
      name: "new",
      fullName: "owner/new",
      url: "https://github.com/owner/new",
      description: null,
      stars: 0,
      defaultBranch: "main",
      updatedAt: "",
      isArchived: false,
      isFork: false,
      isPrivate: false,
      visibility: "public",
      hasReadme: false,
      hasDescription: false,
      meetsStarThreshold: false,
      qualityScore: 0,
      priority: "P4",
    }], outputPath);

    expect(await readFile(outputPath, "utf8")).toBe(`${JSON.stringify([{
      name: "new",
      fullName: "owner/new",
      url: "https://github.com/owner/new",
      description: null,
      stars: 0,
      defaultBranch: "main",
      updatedAt: "",
      isArchived: false,
      isFork: false,
      isPrivate: false,
      visibility: "public",
      hasReadme: false,
      hasDescription: false,
      meetsStarThreshold: false,
      qualityScore: 0,
      priority: "P4",
    }], null, 2)}\n`);

    await writeAnalysisResults([], outputPath);
    expect(await readFile(outputPath, "utf8")).toBe("[]\n");
  });

  it("does not write when analysis fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "gh-analyzet-"));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, "data.json");
    await writeFile(outputPath, "previous data", "utf8");

    await expect(
      analyzeRepositories([repo("broken")], async () => {
        throw new Error("network down");
      }),
    ).rejects.toBeInstanceOf(ReadmeCheckError);
    expect(await readFile(outputPath, "utf8")).toBe("previous data");
  });
});
