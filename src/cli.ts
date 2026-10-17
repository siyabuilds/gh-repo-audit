#!/usr/bin/env node
import { loadConfig } from "./config/env.js";
import { GitHubClient } from "./github/client.js";
import {
  defaultDataPath,
  fetchAndAnalyzeRepositories,
  writeAnalysisResults,
} from "./github/repositories.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new GitHubClient(config.githubToken);
  const analyses = await fetchAndAnalyzeRepositories(
    client,
    config.starThreshold,
  );
  await writeAnalysisResults(analyses);
  console.log(
    `Analyzed ${analyses.length} personally owned repositories. Results written to ${defaultDataPath}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
