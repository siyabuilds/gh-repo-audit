# GitHub Repository Priority Analyzer

A small TypeScript CLI that retrieves every repository personally owned by the authenticated GitHub user, checks repository quality indicators, and returns a deterministic priority-ordered array.

## Setup

Requires Node.js 20 or newer.

```sh
npm install
cp .env.example .env
# Edit .env and set GITHUB_TOKEN
npm run build
npm start
```

The token is read by `dotenv` and is never printed or included in returned repository objects. The token should have the access needed for the private repositories you want to inspect.

After a successful run, the sorted analysis array is written as formatted JSON to `src/data.json`. The command prints only the number of personally owned repositories analyzed and the output location. A failed repository fetch, README check, analysis, or file write leaves the previous output file unchanged.

## Configuration

```dotenv
GITHUB_TOKEN=your-token-here
STAR_THRESHOLD=5
```

`STAR_THRESHOLD` defaults to `5` and must be a non-negative integer. A repository meets the high-stars indicator when its star count is greater than or equal to this threshold.

## Classification and sorting

Each repository has three independent binary indicators:

1. `meetsStarThreshold`
2. `hasReadme`, confirmed with the GitHub README API endpoint
3. `hasDescription`, based on a non-empty About description

The quality score is the number of satisfied indicators:

| Score | Priority    |
| ----: | :---------- |
|     3 | P1 — High   |
|     2 | P2 — Medium |
|     1 | P3 — Low    |
|     0 | P4 — Lowest |

Results are sorted by priority, score, stars, most recent update, and finally alphabetical `fullName`. Sorting copies the input array rather than mutating it.

## Tests

```sh
npm test
```

Tests mock GitHub responses and do not require a real token or network access.

## Example output

```json
[
  {
    "name": "important-project",
    "fullName": "octocat/important-project",
    "url": "https://github.com/octocat/important-project",
    "description": "A useful project",
    "stars": 12,
    "defaultBranch": "main",
    "updatedAt": "2026-01-01T00:00:00Z",
    "isArchived": false,
    "isFork": false,
    "isPrivate": false,
    "visibility": "public",
    "hasReadme": true,
    "hasDescription": true,
    "meetsStarThreshold": true,
    "qualityScore": 3,
    "priority": "P1"
  }
]
```

If a README request fails for a reason other than a confirmed 404, the command fails with an incomplete-analysis error rather than misclassifying the repository.
