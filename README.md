# gh-repo-audit

`gh-repo-audit` is a TypeScript CLI distributed through npm for auditing
personally owned GitHub repositories and prioritizing them using repository
quality indicators.

See the package on npm: [gh-repo-audit](https://www.npmjs.com/package/gh-repo-audit).

You do not need to clone the source repository to use the published package.

## Installation and usage

The simplest way to run the CLI is with `npx`:

```sh
npx gh-repo-audit
```

`npx` downloads and executes `gh-repo-audit` when necessary, so no source
checkout or separate global installation is required.

You can also install the CLI globally:

```sh
npm install -g gh-repo-audit
gh-repo-audit
```

## Requirements and authentication

- Node.js 20 or newer
- A GitHub Personal Access Token supplied as `GITHUB_TOKEN`

Provide the token in the environment:

```sh
export GITHUB_TOKEN=your-token-here
npx gh-repo-audit
```

Alternatively, create a `.env` file in the directory from which you run the
command:

```dotenv
GITHUB_TOKEN=your-token-here
STAR_THRESHOLD=5
```

The CLI loads `.env` from the current working directory. The token must have
access to the repositories you want to inspect, including any private
repositories that should be included.

`STAR_THRESHOLD` is optional and defaults to `5`. When provided, it must be a
non-negative integer. A repository meets the star indicator when its star
count is greater than or equal to the threshold.

Keep tokens out of source control. If `GITHUB_TOKEN` is missing, the CLI exits
with an error. An invalid or unauthorized token is also reported as an error
by the command.

## What the tool does

For the authenticated GitHub user, `gh-repo-audit`:

1. Authenticates with GitHub using `GITHUB_TOKEN`.
2. Retrieves repositories owned by that user, including accessible public and
   private repositories.
3. Checks each repository's star count against `STAR_THRESHOLD`.
4. Checks whether a README exists using GitHub's README API endpoint.
5. Checks whether the repository has a non-empty description.
6. Assigns a quality score and priority.
7. Sorts the analyses and writes them as formatted JSON.

Only repositories personally owned by the authenticated user are included;
repositories owned by organizations or other users are not included.

## Priority classification and sorting

Each repository has three binary indicators:

- `meetsStarThreshold`
- `hasReadme`
- `hasDescription`

The quality score is the number of indicators that are true:

| Quality score | Priority | Meaning |
| ---: | :--- | :--- |
| 3 | P1 | High |
| 2 | P2 | Medium |
| 1 | P3 | Low |
| 0 | P4 | Lowest |

Results are sorted in this order:

1. Priority (`P1` before `P2`, `P3`, and `P4`)
2. Quality score, highest first
3. Star count, highest first
4. Most recently updated repository first
5. `fullName`, alphabetically, as the final tie-breaker

## Output

The CLI writes formatted JSON to `data.json` in the directory from which you
run it:

```text
./data.json
```

The output is an array of `RepositoryAnalysis` objects. For example:

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

The token is not printed or included in repository results. If a README check
fails for a reason other than a confirmed `404`, analysis stops with an error
instead of treating the README as missing. GitHub request failures, invalid
configuration, and output write failures are reported by the CLI and produce
a non-zero process exit status.

## Development

Cloning the source repository is only needed if you want to contribute or run
the project from source. After cloning it, install dependencies:

```sh
npm install
```

Build the TypeScript source:

```sh
npm run build
```

Run the test suite:

```sh
npm test
```

Tests mock GitHub responses and do not require a real token or network access.
To run the CLI directly from TypeScript during development, configure
`GITHUB_TOKEN` as described above and run:

```sh
npm run dev
```

After building, the compiled CLI can be run with:

```sh
npm start
```

## Troubleshooting and project links

- **`GITHUB_TOKEN is missing`**: export `GITHUB_TOKEN` or add it to a `.env`
  file in the current working directory.
- **`STAR_THRESHOLD must be a non-negative integer`**: use a whole number such
  as `0`, `5`, or `10`; decimal and negative values are rejected.
- **`401 Unauthorized`**: verify that the token is valid and has the required
  access.
- **`403` or repeated GitHub request failures**: check token permissions and
  GitHub API rate limits.
- **Output write errors**: check that the current directory and destination
  are writable.

Package page: [https://www.npmjs.com/package/gh-repo-audit](https://www.npmjs.com/package/gh-repo-audit)
