# Contributing {#contributing}

## Documentation and report site

`docs/` contains tracked VitePress source. Keep English and `zh/` page filenames aligned and update both languages for behavior changes.

Keep migration guides versioned as `docs/migrations/migration-to-<major>.md` and `docs/zh/migrations/migration-to-<major>.md`, preserving earlier guides when adding a new major version. Add each guide to `docs/.vitepress/pages.js` in the `migrations` group; both language sidebars use that list. English `docs/migrations/migration-to-*.md` guides are included in the npm package automatically.

```sh
npm ci
npm run docs:dev
npm run docs:check
npm run docs:preview
```

All documentation output stays under `.temp/`: `.temp/site/` is the published site, `.temp/vitepress-cache/` holds caches, and `.temp/vitepress-ssr/` holds intermediate SSR files. Integration tests write directly to `.temp/site/reports/`; the demo list is maintained as the VitePress pages `docs/examples.md` and `docs/zh/examples.md`, with direct links to reports. All report HTML, data and asset URLs use `/monocart-coverage-reports/reports/`; old URLs are not supported.

`npm run docs:dev` serves existing reports directly from `.temp/site/reports/`, without modifying their HTML or scripts. The **Report Examples** page renders without reports. Run the corresponding repository tests before opening individual reports locally. Missing reports return a 404 with these instructions; the development server does not run tests automatically.

Documentation rebuilds preserve reports. For a completely fresh local site, clean only the dedicated `.temp/site/` output, then rebuild documentation and regenerate the required reports. Never clean or generate over `docs/`. CI builds documentation and reports separately, then downloads them into the same site directory for publishing.

- Latest Node.js 24 LTS recommended for development; minimum package runtime is 22.15.0. Development tools may require a newer patch than the minimum runtime.
- VSCode (extensions: eslint/stylelint/vue)
```sh
npm install
npx playwright install --with-deps

npm run build
npm run lint
npm run test

npm run dev
```
`npm run lint:docs` automatically fixes lint issues using ESLint directly for the VitePress configuration and Vue theme in `docs/`, plus JavaScript code fences in documentation and both READMEs. The official `@eslint/markdown` processor maps diagnostics and fixes back to the Markdown source. `js`, `javascript`, `mjs` and `cjs` fences support the project's syntax/style rules, including VitePress annotations such as `js{1,3-5}:line-numbers` and code-group filenames. Only `no-undef` and `no-unused-vars` are disabled for snippets that omit surrounding context; other correctness rules remain enabled. TypeScript (`ts`) and text fences are not checked as JavaScript. Markdown prose is not reformatted.

For intentionally nonstandard syntax demonstrations, keep `js` highlighting and place `<!-- eslint-skip -->` immediately before that code fence. It skips only that example, including during autofix; repeat the comment for each intentional exception. Do not use JavaScript `eslint-disable` comments to hide errors in normal examples. VSCode's ESLint integration validates Markdown and supports formatting/code fixes with the checked-in editor settings.

```sh
npm run lint:docs             # Check and automatically fix
npm run lint:docs -- --no-fix # Check only (also used by docs:check)
```

Preserve UTF-8 and LF line endings. Do not run `npm run eol` as a validation or formatting command.
