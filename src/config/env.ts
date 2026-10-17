import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  githubToken: string;
  starThreshold: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const githubToken = env.GITHUB_TOKEN?.trim();
  if (!githubToken) {
    throw new Error(
      "GITHUB_TOKEN is missing. Copy .env.example to .env and add a GitHub Personal Access Token before running the analyzer.",
    );
  }

  const rawThreshold = env.STAR_THRESHOLD?.trim() || "5";
  const starThreshold = Number(rawThreshold);
  if (!Number.isInteger(starThreshold) || starThreshold < 0) {
    throw new Error("STAR_THRESHOLD must be a non-negative integer.");
  }

  return { githubToken, starThreshold };
}
