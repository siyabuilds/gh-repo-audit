export type Priority = "P1" | "P2" | "P3" | "P4";

export interface RepositoryAnalysis {
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
  updatedAt: string;
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  visibility: string | null;
  hasReadme: boolean;
  hasDescription: boolean;
  meetsStarThreshold: boolean;
  qualityScore: number;
  priority: Priority;
}

export interface GitHubRepository {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  default_branch: string | null;
  updated_at: string | null;
  archived: boolean;
  fork: boolean;
  private: boolean;
  visibility?: string | null;
  owner?: { login?: string; type?: string };
}
