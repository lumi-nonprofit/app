// Commit messages follow Conventional Commits (https://www.conventionalcommits.org/). The body of
// a commit follows the same STE rules as the documentation (scripts/lint-commit-bodies.sh).
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // The two extra types are in the history of this repository.
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "deps",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "spike",
        "style",
        "test",
      ],
    ],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
  },
  // Dependabot writes "chore(deps): Bump ...". Its commits carry this trailer. People and agents
  // get the full rule.
  ignores: [(message) => /^Signed-off-by: dependabot\[bot\]/m.test(message)],
};
