Reply in the user's language.

## MCR setup and troubleshooting

If the existing command produces the reports you need, use the workflow above. For collection setup, missing reports, sourcemap issues, report merging, or CI gate configuration, locate the bundled `monocart-coverage-reports` skill.

Run this command from the package directory that declares the MCR dependency. In a monorepo, use the relevant workspace package rather than the repository root unless the root declares MCR.

`node -p "require.resolve('monocart-coverage-reports/skills/monocart-coverage-reports/SKILL.md')"`

Read the returned `SKILL.md` and follow only its references relevant to the task. If you cannot run the command or resolve the skill from the correct package, report that limitation. Do not install or upgrade dependencies without approval.
