import { createHash } from 'node:crypto';
import {
    mkdir, readFile, stat, writeFile
} from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { excludeIntegrationRepos } from '../../docs/.vitepress/theme/home-integration-repos.js';
import { manual, reviewed } from './who.sources.js';

const github = 'https://github.com';
const owner = 'cenfun';
const dependents = `${github}/${owner}/monocart-coverage-reports/network/dependents`;
const dependency = 'monocart-coverage-reports';
const workDir = new URL('../../.temp/who/', import.meta.url);
const cacheDir = new URL('cache/', workDir);
const poolFile = new URL('who.pool.json', import.meta.url);
const filteredFile = new URL('who.filterred.json', import.meta.url);
const minPoolStars = 1000;
const maxAge = 24 * 60 * 60 * 1000;
const repoPattern = /^[\w.-]+\/[\w.-]+$/;
const usage = `Usage: npm run who -- [--write] [--refresh]
  --write    Update the >${minPoolStars}-star pool and filtered homepage list
  --refresh  Ignore cached responses (normally reused for up to 24 hours)`;

const keyFor = (repo) => repo.toLowerCase();
const isThirdParty = ({ repo }) => !keyFor(String(repo)).startsWith(`${owner}/`);
const byStars = (a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo, 'en');
const repoLink = (repo) => `${github}/${repo}`;
const blobLink = (repo, path) => `${repoLink(repo)}/blob/HEAD/${path.split('/').map(encodeURIComponent).join('/')}`;
const withLinks = (project) => ({
    ... project,
    link: repoLink(project.repo),
    ... (project.evidence && {
        evidenceLink: blobLink(project.repo, project.evidence)
    })
});

const readCache = async (path) => {
    try {
        if (Date.now() - (await stat(path)).mtimeMs < maxAge) {
            return await readFile(path, 'utf8');
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    return null;
};

const waitForRateLimit = async (url, res) => {
    const wait = Number(res.headers.get('retry-after')) || 60;
    console.warn(`Rate limit from ${new URL(url).hostname}; retrying in ${wait}s`);
    await delay(wait * 1000);
};

const fetchText = async (url, accept) => {
    for (let attempt = 0; ; attempt++) {
        try {
            const res = await fetch(url, {
                headers: {
                    accept
                },
                signal: AbortSignal.timeout(20000)
            });
            if (res.status === 404) {
                return null;
            }
            if (res.status === 429 && attempt < 2) {
                await waitForRateLimit(url, res);
                continue;
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return await res.text();
        } catch (error) {
            if (attempt === 2) {
                throw new Error(`${url}: ${error.message}`, {
                    cause: error
                });
            }
            await delay(800 * (attempt + 1));
        }
    }
};

const requestText = async (url, refresh, accept = '*/*') => {
    const path = new URL(`${createHash('sha256').update(url).digest('hex')}.html`, cacheDir);
    const cached = refresh ? null : await readCache(path);
    if (cached !== null) {
        return cached;
    }
    const body = await fetchText(url, accept);
    if (body !== null) {
        await writeFile(path, body);
        if (url.startsWith(dependents)) {
            await delay(300);
        }
    }
    return body;
};

const mapConcurrent = async (items, count, run) => {
    let next = 0;
    const results = new Array(items.length);
    await Promise.all(Array.from({
        length: Math.min(count, items.length)
    }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await run(items[index]);
        }
    }));
    return results;
};

const parseDependentsPage = (html, url) => {
    const matches = [... (html ?? '').matchAll(/data-hovercard-type="repository"[^>]+href="\/([\w.-]+\/[\w.-]+)"[^>]*>[^<]+<\/a>(?:(?!data-hovercard-type="repository")[\s\S])*?class="octicon octicon-star"[\s\S]*?<\/svg>\s*([\d,]+)\s*<\/span>/g)];
    if (!matches.length) {
        throw new Error(`No Dependents rows parsed: ${url}`);
    }
    const rows = matches.map(([, repo, count]) => ({
        repo, stars: Number(count.replaceAll(',', ''))
    }));
    const next = html.match(/data-test-selector="pagination"[^>]*>[^\r\n]*?href="([^"]+)"[^>]*>Next<\/a>/);
    return {
        rows, nextUrl: next ? new URL(next[1].replaceAll('&amp;', '&'), dependents).href : ''
    };
};

const readAdvertisedCount = (html, type) => {
    const pattern = type === 'PACKAGE' ? /([\d,]+)\s+Packages\b/ : /([\d,]+)\s+Repositories\b/;
    const count = html.match(pattern)?.[1];
    return count ? Number(count.replaceAll(',', '')) : null;
};

const readDependents = async (type, request) => {
    const visited = new Set();
    const rows = [];
    let advertised = null;
    let url = type === 'PACKAGE' ? `${dependents}?dependent_type=PACKAGE` : dependents;
    while (url) {
        if (visited.has(url) || !(url === dependents || url.startsWith(`${dependents}?`))) {
            throw new Error(`Unexpected Dependents pagination: ${url}`);
        }
        visited.add(url);
        const html = await request(url);
        const page = parseDependentsPage(html, url);
        if (visited.size === 1) {
            advertised = readAdvertisedCount(html, type);
        }
        rows.push(... page.rows);
        url = page.nextUrl;
    }
    console.log(`GitHub ${type}: ${visited.size} pages, ${rows.length} visible rows (advertised: ${advertised ?? 'unknown'})`);
    return {
        type, advertised, pages: visited.size, rows
    };
};

const readPayloads = (html) => [... html.matchAll(/<script type="application\/json" data-target="react-app\.embeddedData">(.*?)<\/script>/gs)]
    .map(([, embedded]) => JSON.parse(embedded).payload);

const eligibleRepo = (metadata, repo) => metadata.isFork === false && metadata.isArchived === false
    && keyFor(`${metadata.ownerLogin}/${metadata.name}`) === keyFor(repo);

const checkPoolRepo = async ({ repo }, request) => {
    const url = repoLink(repo);
    const html = await request(url);
    const metadata = html && readPayloads(html).find((payload) => payload?.codeViewLayoutRoute?.repo)?.codeViewLayoutRoute.repo;
    if (typeof metadata?.isFork !== 'boolean' || typeof metadata?.isArchived !== 'boolean') {
        throw new Error(`GitHub repository status unavailable: ${url}`);
    }
    return eligibleRepo(metadata, repo);
};

const ownerAvatar = (url) => {
    const path = url?.match(/^https:\/\/avatars\.githubusercontent\.com\/(u\/\d+)(?:\?|$)/)?.[1];
    return path ? `https://avatars.githubusercontent.com/${path}?s=96&v=4` : null;
};

const parseBlob = (payload, repo) => {
    const metadata = payload?.codeViewLayoutRoute?.repo;
    const content = payload?.['codeViewBlobLayoutRoute.StyledBlob']?.rawLines;
    if (!metadata || !Array.isArray(content)) {
        return null;
    }
    return {
        text: content.join('\n'),
        eligible: eligibleRepo(metadata, repo),
        avatar: ownerAvatar(metadata.ownerAvatar)
    };
};

// Read GitHub's public blob view to obtain the source and verify fork/archive
// status in one request. HEAD resolves to the current default branch.
const readBlob = async (repo, path, request) => {
    const url = blobLink(repo, path);
    const html = await request(url);
    if (html === null) {
        return null;
    }
    for (const payload of readPayloads(html)) {
        const source = parseBlob(payload, repo);
        if (source) {
            return source;
        }
    }
    throw new Error(`GitHub source view could not be parsed: ${url}`);
};

const probeReviewed = async (project, request) => {
    const source = await readBlob(project.repo, project.evidence, request);
    if (!source?.eligible || !(project.match ?? [dependency]).every((text) => source.text.includes(text))) {
        console.warn(`No longer verified: ${project.repo} (${project.evidence})`);
        return null;
    }
    return withLinks({
        ... project,
        avatar: source.avatar
    });
};

const manifestPaths = async function *(repo, request) {
    yield 'package.json';
    // Use GitHub's file finder index to locate nested manifests on HEAD.
    const url = `${repoLink(repo)}/tree-list/HEAD`;
    const result = JSON.parse(await request(url, 'application/json'));
    if (!Array.isArray(result?.paths)) {
        throw new Error(`GitHub file list unavailable: ${url}`);
    }
    yield* result.paths.filter((path) => path.endsWith('/package.json'));
};

const declaresMCR = (text) => {
    const manifest = JSON.parse(text);
    return ['dependencies', 'devDependencies', 'optionalDependencies']
        .some((field) => Object.hasOwn(manifest[field] ?? {}, dependency));
};

const manifestCard = (project, evidence, avatar) => withLinks({
    ... project,
    name: project.name ?? project.repo.split('/')[1],
    evidence,
    avatar
});

const probeManifest = async (project, request) => {
    const { repo } = project;
    let failure;
    for await (const evidence of manifestPaths(repo, request)) {
        try {
            const source = await readBlob(repo, evidence, request);
            if (source?.eligible && declaresMCR(source.text)) {
                return manifestCard(project, evidence, source.avatar);
            }
        } catch (error) {
            failure ??= new Error(`${evidence}: ${error.message}`, {
                cause: error
            });
        }
    }
    if (failure) {
        throw failure;
    }
    return null;
};

const toCard = ({
    repo, name, stars, link, evidenceLink, avatar
}) => ({
    repo,
    name,
    stars,
    link,
    ... (evidenceLink && {
        evidenceLink
    }),
    avatar
});

const getReviewOverrides = () => {
    const overrides = new Map(reviewed.map((project) => [keyFor(project.repo), project]));
    const seen = new Set();
    for (const project of manual.filter(isThirdParty)) {
        const { repo, name } = project;
        if (!repoPattern.test(repo) || typeof name !== 'string' || !name.trim() || seen.has(keyFor(repo))) {
            throw new Error(`Invalid or duplicate manual project: ${repo}`);
        }
        const key = keyFor(repo);
        seen.add(key);
        overrides.set(key, {
            ... overrides.get(key),
            ... project
        });
    }
    return overrides;
};

const parseOptions = () => parseArgs({
    options: {
        help: {
            type: 'boolean', short: 'h'
        },
        write: {
            type: 'boolean'
        },
        refresh: {
            type: 'boolean'
        }
    }
}).values;

const mergeInventory = (rows) => {
    const inventory = new Map();
    for (const row of rows) {
        const key = keyFor(row.repo);
        const previous = inventory.get(key);
        if (!previous || previous.stars < row.stars) {
            inventory.set(key, row);
        }
    }
    return inventory;
};

const buildPool = async (rows, request) => {
    const ranked = [... rows].filter(({ stars }) => stars > minPoolStars).sort(byStars);
    const failedPoolChecks = [];
    const checked = await mapConcurrent(ranked, 4, async (row) => {
        try {
            return await checkPoolRepo(row, request) ? row : null;
        } catch (error) {
            failedPoolChecks.push({
                repo: row.repo, message: error.message
            });
            return null;
        }
    });
    if (failedPoolChecks.length) {
        console.warn(`${failedPoolChecks.length} candidates had unknown repository status; see the report`);
    }
    return {
        pool: checked.filter(Boolean), failedPoolChecks
    };
};

const planVerification = (pool) => {
    const overrides = getReviewOverrides();
    const known = [];
    const probes = [];
    for (const row of excludeIntegrationRepos(pool).filter(isThirdParty)) {
        const project = {
            ... overrides.get(keyFor(row.repo)),
            ... row
        };
        (project.evidence ? known : probes).push(project);
    }
    return {
        known, probes
    };
};

const verifyCandidates = async (known, probes, request) => {
    console.log(`Checking ${known.length} reviewed files and searching manifests in ${probes.length} additional repositories`);
    const failedProbes = [];
    const verified = await mapConcurrent([... known, ... probes], 4, async (project) => {
        try {
            const probe = project.evidence ? probeReviewed : probeManifest;
            return await probe(project, request);
        } catch (error) {
            failedProbes.push({
                repo: project.repo, message: error.message
            });
            return null;
        }
    });
    if (failedProbes.length) {
        console.warn(`${failedProbes.length} candidate files could not be verified; see the report`);
    }
    return {
        candidates: verified.filter(Boolean), failedProbes
    };
};

const writeReport = async (data) => {
    const report = new URL('results.json', workDir);
    await writeFile(report, `${JSON.stringify(data, null, 2)}\n`);
    console.table(data.selected.map(({ name, stars }) => ({
        name, stars
    })));
    console.log('Report: .temp/who/results.json');
};

const writeSnapshots = async (pool, selected) => {
    const cards = selected.map(toCard);
    const missingAvatar = cards.find(({ avatar }) => !avatar);
    if (missingAvatar) {
        throw new Error(`GitHub owner avatar unavailable: ${missingAvatar.repo}`);
    }
    await writeFile(poolFile, `${JSON.stringify(pool, null, 4)}\n`);
    await writeFile(filteredFile, `${JSON.stringify(cards, null, 4)}\n`);
    console.log('Updated scripts/who/who.pool.json and scripts/who/who.filterred.json');
};

const main = async () => {
    const values = parseOptions();
    if (values.help) {
        console.log(usage);
        return;
    }
    await mkdir(cacheDir, {
        recursive: true
    });
    const request = (url, accept) => requestText(url, values.refresh, accept);
    const tabs = await Promise.all(['REPOSITORY', 'PACKAGE'].map((type) => readDependents(type, request)));
    const inventory = mergeInventory(tabs.flatMap(({ rows }) => rows));
    console.log(`${inventory.size} unique visible repositories`);
    const { pool, failedPoolChecks } = await buildPool(inventory.values(), request);
    const { known, probes } = planVerification(pool);
    const { candidates, failedProbes } = await verifyCandidates(known, probes, request);
    const selected = candidates.sort(byStars);
    await writeReport({
        sources: tabs.map(({ rows, ... summary }) => ({
            ... summary,
            visibleRows: rows.length
        })),
        candidates: inventory.size,
        pool,
        selected,
        failedPoolChecks,
        failedProbes
    });
    if (values.write) {
        await writeSnapshots(pool, selected);
    }
};

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
