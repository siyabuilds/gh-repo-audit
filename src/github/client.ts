const API_BASE_URL = "https://api.github.com";
const USER_AGENT = "github-repo-prioritizer";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export interface GitHubClientOptions {
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  timeoutMs?: number;
  baseUrl?: string;
}

export class GitHubClient {
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(
    private readonly token: string,
    options: GitHubClientOptions = {},
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxRetries = options.maxRetries ?? 3;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.baseUrl = options.baseUrl ?? API_BASE_URL;
  }

  async getJson<T>(endpoint: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${this.token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": USER_AGENT,
          },
          signal: controller.signal,
        });

        if (response.ok) return (await response.json()) as T;

        const retryable = response.status === 429 || response.status >= 500;
        const message = await response.text().catch(() => "");
        const error = new GitHubApiError(
          this.errorMessage(response.status, message),
          response.status,
          endpoint,
        );
        if (!retryable || attempt === this.maxRetries) throw error;
        lastError = error;
      } catch (error) {
        if (error instanceof GitHubApiError && error.status === 401) {
          throw new Error(
            "GitHub rejected the token (401 Unauthorized). Check that GITHUB_TOKEN is valid and has the required access.",
          );
        }
        if (error instanceof GitHubApiError && error.status === 404)
          throw error;
        lastError = error;
        if (attempt === this.maxRetries) break;
      } finally {
        clearTimeout(timeout);
      }
      await this.delay(250 * 2 ** attempt);
    }

    throw new Error(
      `GitHub request failed after ${this.maxRetries + 1} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  private errorMessage(status: number, body: string): string {
    if (status === 403) {
      return "GitHub denied the request (403). Check token permissions and rate limits.";
    }
    return `GitHub API request failed with status ${status}${body ? `: ${body.slice(0, 200)}` : ""}.`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
