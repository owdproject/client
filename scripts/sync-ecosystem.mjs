#!/usr/bin/env node

/**
 * OpenWebDesktop Ecosystem Synchronization & Update Tool
 * 
 * Synchronizes apps, themes, modules, and kits updated within the last year
 * across the OWD ecosystem (owdproject & dxlliv) to prepare for 4.0.0-alpha.0.
 *
 * Usage:
 *   node sync-ecosystem.mjs [command] [options]
 *
 * Commands:
 *   sync            Clone missing repos and pull/check existing repos (default)
 *   status          Compare local state with remote without modifying
 *   pull            Pull updates on all existing repos (ff-only)
 *   clone           Clone only missing repos
 *   inspect         Inspect package.json dependencies and 4.0.0-alpha.0 readiness
 *   rename-preview  Preview naming transformations for 4.0.0-alpha.0
 *
 * Options:
 *   --target <dir>  Target base directory (default: auto-detect client or .)
 *   --days <n>      Filter repos updated within the last N days (default: 365)
 *   --all           Include all repos regardless of update date
 *   --category <c>  Filter by category: apps, themes, modules, kits, all (default: all)
 *   --https         Use HTTPS URLs instead of SSH
 *   --dry-run       Simulate without modifying filesystem or git
 *   --json          Output results in JSON format
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

// CLI parsing
const rawArgs = process.argv.slice(2);
const command = (rawArgs[0] && !rawArgs[0].startsWith('--')) ? rawArgs[0] : 'sync';

function getArgValue(name, defaultValue) {
  const prefix = `--${name}=`;
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a.startsWith(prefix)) return a.slice(prefix.length);
    if (a === `--${name}` && rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--')) {
      return rawArgs[i + 1];
    }
  }
  return defaultValue;
}

const hasFlag = (name) => rawArgs.includes(`--${name}`);

const optTarget = getArgValue('target', null);
const optDays = parseInt(getArgValue('days', '365'), 10);
const optAll = hasFlag('all');
const optCategory = getArgValue('category', 'all').toLowerCase();
const optHttps = hasFlag('https');
const optDryRun = hasFlag('dry-run');
const optJson = hasFlag('json');

// Color helpers
const isTTY = process.stdout.isTTY && !optJson;
const c = {
  reset: isTTY ? '\x1b[0m' : '',
  bold: isTTY ? '\x1b[1m' : '',
  dim: isTTY ? '\x1b[2m' : '',
  red: isTTY ? '\x1b[31m' : '',
  green: isTTY ? '\x1b[32m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  blue: isTTY ? '\x1b[34m' : '',
  magenta: isTTY ? '\x1b[35m' : '',
  cyan: isTTY ? '\x1b[36m' : '',
  white: isTTY ? '\x1b[37m' : '',
  gray: isTTY ? '\x1b[90m' : '',
};

function log(msg, symbol = 'ℹ') {
  if (optJson) return;
  console.log(`${c.cyan}${symbol}${c.reset} ${msg}`);
}

function success(msg) {
  if (optJson) return;
  console.log(`${c.green}✔${c.reset} ${msg}`);
}

function warn(msg) {
  if (optJson) return;
  console.log(`${c.yellow}⚠${c.reset} ${msg}`);
}

function error(msg) {
  if (optJson) return;
  console.error(`${c.red}✖${c.reset} ${msg}`);
}

// Resolve base directory
function resolveBaseDir() {
  if (optTarget) return resolve(optTarget);

  const cwd = process.cwd();
  // If cwd is client itself or has apps/themes/packages
  if (existsSync(join(cwd, 'apps')) && existsSync(join(cwd, 'packages'))) {
    return cwd;
  }
  // If cwd has client/
  if (existsSync(join(cwd, 'client', 'apps'))) {
    return join(cwd, 'client');
  }
  return cwd;
}

const BASE_DIR = resolveBaseDir();
const APPS_DIR = join(BASE_DIR, 'apps');
const THEMES_DIR = join(BASE_DIR, 'themes');
const PACKAGES_DIR = join(BASE_DIR, 'packages');

function ensureDirectories() {
  if (optDryRun) return;
  for (const dir of [APPS_DIR, THEMES_DIR, PACKAGES_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

// Fetch list of repositories from GitHub via gh CLI
function fetchGitHubRepos() {
  const owners = ['owdproject', 'dxlliv'];
  const allRepos = [];

  for (const owner of owners) {
    try {
      const res = spawnSync('gh', [
        'repo', 'list', owner,
        '--limit', '200',
        '--json', 'name,description,pushedAt,updatedAt,isArchived,isFork,url,sshUrl,defaultBranchRef'
      ], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

      if (res.status === 0 && res.stdout) {
        const list = JSON.parse(res.stdout);
        for (const item of list) {
          item.owner = owner;
          allRepos.push(item);
        }
      } else {
        warn(`Could not list repos for ${owner} via gh CLI: ${res.stderr || 'unknown error'}`);
      }
    } catch (e) {
      warn(`Failed to execute gh CLI for ${owner}: ${e.message}`);
    }
  }

  return allRepos;
}

// Classify category
function classifyRepo(name) {
  const n = name.toLowerCase();
  if (['desktop', 'client', 'core', 'cli', 'docs', 'suite', 'suite-1', 'suite-2', 'nx', 'articles', 'owdproject.org'].includes(n)) {
    return 'system';
  }
  if (n.startsWith('app-') || n.startsWith('owd-app-') || n === 'owd-webamp') {
    return 'app';
  }
  if (n.startsWith('theme-') || n.startsWith('owd-theme-')) {
    return 'theme';
  }
  if (n.startsWith('module-') || n.startsWith('owd-module-')) {
    return 'module';
  }
  if (n.startsWith('kit-')) {
    return 'kit';
  }
  return 'other';
}

// Map repo to target subfolder
function getTargetFolder(category, name) {
  if (category === 'app') return join(APPS_DIR, name);
  if (category === 'theme') return join(THEMES_DIR, name);
  if (category === 'module' || category === 'kit') return join(PACKAGES_DIR, name);
  return null;
}

// Check git status of a local directory
function inspectLocalGit(dirPath) {
  if (!existsSync(dirPath) || !existsSync(join(dirPath, '.git'))) {
    return null;
  }

  try {
    const branchRes = spawnSync('git', ['-C', dirPath, 'branch', '--show-current'], { encoding: 'utf-8' });
    const currentBranch = branchRes.stdout ? branchRes.stdout.trim() : '';

    const remoteRes = spawnSync('git', ['-C', dirPath, 'remote', 'get-url', 'origin'], { encoding: 'utf-8' });
    const remoteUrl = remoteRes.stdout ? remoteRes.stdout.trim() : '';

    const statusRes = spawnSync('git', ['-C', dirPath, 'status', '--porcelain'], { encoding: 'utf-8' });
    const isDirty = (statusRes.stdout && statusRes.stdout.trim().length > 0);
    const dirtyFileCount = isDirty ? statusRes.stdout.trim().split('\n').length : 0;

    let ahead = 0;
    let behind = 0;
    let upstreamBranch = '';

    if (currentBranch) {
      const upstreamRes = spawnSync('git', ['-C', dirPath, 'rev-parse', '--abbrev-ref', `${currentBranch}@{u}`], { encoding: 'utf-8' });
      if (upstreamRes.status === 0 && upstreamRes.stdout) {
        upstreamBranch = upstreamRes.stdout.trim();
        const diffRes = spawnSync('git', ['-C', dirPath, 'rev-list', '--left-right', '--count', `${currentBranch}...${upstreamBranch}`], { encoding: 'utf-8' });
        if (diffRes.status === 0 && diffRes.stdout) {
          const parts = diffRes.stdout.trim().split(/\s+/);
          ahead = parseInt(parts[0], 10) || 0;
          behind = parseInt(parts[1], 10) || 0;
        }
      }
    }

    // Inspect package.json if present
    let pkgJson = null;
    const pkgPath = join(dirPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      } catch {}
    }

    return {
      exists: true,
      path: dirPath,
      currentBranch,
      remoteUrl,
      upstreamBranch,
      ahead,
      behind,
      isDirty,
      dirtyFileCount,
      pkgJson
    };
  } catch (e) {
    return {
      exists: true,
      path: dirPath,
      error: e.message
    };
  }
}

// Main runner
async function main() {
  if (!optJson) {
    console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
    console.log(`${c.bold} OpenWebDesktop Ecosystem Synchronizer (Target: 4.0.0-alpha.0)  ${c.reset}`);
    console.log(`${c.cyan}================================================================${c.reset}`);
    console.log(`${c.gray}Base Directory:${c.reset} ${BASE_DIR}`);
    console.log(`${c.gray}Command:${c.reset}        ${command}`);
    console.log(`${c.gray}Time Window:${c.reset}    ${optAll ? 'All time' : `Last ${optDays} days`}`);
    console.log(`${c.gray}Category:${c.reset}       ${optCategory}`);
    console.log(`${c.cyan}----------------------------------------------------------------${c.reset}\n`);
  }

  ensureDirectories();

  // 1. Discover all repos
  log('Querying GitHub repositories for owdproject and dxlliv...', '🔍');
  const allRepos = fetchGitHubRepos();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - optDays);

  // Group by name to prefer local remotes or latest push
  const candidateRepos = new Map();

  for (const repo of allRepos) {
    const cat = classifyRepo(repo.name);
    if (!['app', 'theme', 'module', 'kit'].includes(cat)) continue;
    if (optCategory !== 'all' && optCategory !== `${cat}s` && optCategory !== cat) continue;

    const pushedAt = repo.pushedAt ? new Date(repo.pushedAt) : null;
    const updatedAt = repo.updatedAt ? new Date(repo.updatedAt) : null;
    const lastActive = (pushedAt && updatedAt) ? (pushedAt > updatedAt ? pushedAt : updatedAt) : (pushedAt || updatedAt);

    if (!optAll && (!lastActive || lastActive < cutoff)) {
      continue;
    }

    repo.category = cat;
    repo.lastActive = lastActive;

    // Deduplication rule: If repo exists in both dxlliv and owdproject:
    // Prefer owdproject unless dxlliv is newer or already cloned from dxlliv
    const targetDir = getTargetFolder(cat, repo.name);
    const localInfo = targetDir ? inspectLocalGit(targetDir) : null;

    if (candidateRepos.has(repo.name)) {
      const existing = candidateRepos.get(repo.name);
      if (localInfo && localInfo.remoteUrl.includes(repo.owner)) {
        candidateRepos.set(repo.name, repo);
      } else if (existing.lastActive && repo.lastActive && repo.lastActive > existing.lastActive) {
        candidateRepos.set(repo.name, repo);
      }
    } else {
      candidateRepos.set(repo.name, repo);
    }
  }

  const selectedRepos = Array.from(candidateRepos.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  log(`Found ${selectedRepos.length} candidate repositories matching criteria.\n`, '📦');

  const results = [];

  for (const repo of selectedRepos) {
    const targetDir = getTargetFolder(repo.category, repo.name);
    let localGit = inspectLocalGit(targetDir);
    const cloneUrl = optHttps ? repo.url : repo.sshUrl;
    const defaultBranch = repo.defaultBranchRef?.name || 'main';

    const itemResult = {
      name: repo.name,
      owner: repo.owner,
      category: repo.category,
      targetDir,
      isArchived: repo.isArchived,
      pushedAt: repo.pushedAt,
      defaultBranch,
      cloneUrl,
      localExists: !!localGit,
      actionTaken: 'none',
      status: 'pending',
      version: null,
      coreDep: null,
      readyFor4Alpha: false
    };

    if (localGit?.pkgJson) {
      itemResult.version = localGit.pkgJson.version || 'unknown';
      const coreDep = localGit.pkgJson.peerDependencies?.['@owdproject/core'] ||
                      localGit.pkgJson.dependencies?.['@owdproject/core'] ||
                      localGit.pkgJson.devDependencies?.['@owdproject/core'];
      itemResult.coreDep = coreDep || 'none';
      itemResult.readyFor4Alpha = typeof coreDep === 'string' && (coreDep.includes('4.0.0') || coreDep.includes('alpha'));
    }

    if (command === 'status' || command === 'inspect' || command === 'rename-preview') {
      if (!localGit) {
        itemResult.status = 'MISSING_LOCAL';
      } else {
        // Fetch to compare
        if (command === 'status') {
          spawnSync('git', ['-C', targetDir, 'fetch', '--quiet']);
          localGit = inspectLocalGit(targetDir);
        }
        itemResult.status = localGit.isDirty
          ? `DIRTY (${localGit.dirtyFileCount} files)`
          : (localGit.behind > 0 ? `BEHIND (${localGit.behind})` : (localGit.ahead > 0 ? `AHEAD (${localGit.ahead})` : 'UP_TO_DATE'));
      }
      results.push(itemResult);
      continue;
    }

    // CLONE OR SYNC
    if (!localGit) {
      if (command === 'pull') {
        itemResult.status = 'SKIPPED (not cloned)';
        results.push(itemResult);
        continue;
      }

      // Need to clone
      log(`[${repo.category.toUpperCase()}] Cloning ${repo.name} (${repo.owner}/${repo.name})...`, '⬇');
      if (optDryRun) {
        itemResult.actionTaken = 'dry-run clone';
        itemResult.status = 'WOULD_CLONE';
      } else {
        try {
          // Attempt clone via SSH or HTTPS
          const cloneCmd = `git clone --branch "${defaultBranch}" "${cloneUrl}" "${targetDir}"`;
          const cloneRes = spawnSync('sh', ['-c', cloneCmd], { encoding: 'utf-8' });

          if (cloneRes.status === 0) {
            success(`Cloned ${repo.name} on branch ${defaultBranch}`);
            itemResult.actionTaken = 'cloned';
            itemResult.status = 'CLONED';
          } else {
            // Try fallback without specifying branch (in case branch is empty or different)
            const fallbackCmd = `git clone "${cloneUrl}" "${targetDir}"`;
            const fallbackRes = spawnSync('sh', ['-c', fallbackCmd], { encoding: 'utf-8' });

            if (fallbackRes.status === 0) {
              success(`Cloned ${repo.name} (default branch fallback)`);
              itemResult.actionTaken = 'cloned (fallback)';
              itemResult.status = 'CLONED';
            } else if (!optHttps && repo.url) {
              // Try HTTPS fallback
              const httpsCmd = `git clone "${repo.url}" "${targetDir}"`;
              const httpsRes = spawnSync('sh', ['-c', httpsCmd], { encoding: 'utf-8' });
              if (httpsRes.status === 0) {
                success(`Cloned ${repo.name} via HTTPS`);
                itemResult.actionTaken = 'cloned (https)';
                itemResult.status = 'CLONED';
              } else {
                error(`Failed to clone ${repo.name}: ${fallbackRes.stderr || httpsRes.stderr}`);
                itemResult.actionTaken = 'error';
                itemResult.status = `CLONE_FAILED: ${(fallbackRes.stderr || '').slice(0, 80)}`;
              }
            } else {
              error(`Failed to clone ${repo.name}: ${fallbackRes.stderr}`);
              itemResult.actionTaken = 'error';
              itemResult.status = `CLONE_FAILED: ${(fallbackRes.stderr || '').slice(0, 80)}`;
            }
          }
        } catch (e) {
          error(`Exception while cloning ${repo.name}: ${e.message}`);
          itemResult.actionTaken = 'exception';
          itemResult.status = `ERROR: ${e.message}`;
        }
      }

      // Re-inspect package.json after clone
      const postLocal = inspectLocalGit(targetDir);
      if (postLocal?.pkgJson) {
        itemResult.version = postLocal.pkgJson.version || 'unknown';
        const coreDep = postLocal.pkgJson.peerDependencies?.['@owdproject/core'] ||
                        postLocal.pkgJson.dependencies?.['@owdproject/core'] ||
                        postLocal.pkgJson.devDependencies?.['@owdproject/core'];
        itemResult.coreDep = coreDep || 'none';
        itemResult.readyFor4Alpha = typeof coreDep === 'string' && (coreDep.includes('4.0.0') || coreDep.includes('alpha'));
      }
    } else {
      // Local exists: Fetch & Pull
      if (command === 'clone') {
        itemResult.status = 'ALREADY_EXISTS';
        results.push(itemResult);
        continue;
      }

      if (optDryRun) {
        itemResult.actionTaken = 'dry-run fetch/pull';
        itemResult.status = 'WOULD_CHECK';
        results.push(itemResult);
        continue;
      }

      // Fetch
      spawnSync('git', ['-C', targetDir, 'fetch', '--quiet']);
      localGit = inspectLocalGit(targetDir);

      if (localGit.isDirty) {
        warn(`[${repo.category.toUpperCase()}] ${repo.name} has uncommitted changes (${localGit.dirtyFileCount} files). Skipping auto-pull.`);
        itemResult.actionTaken = 'skipped (dirty)';
        itemResult.status = `DIRTY (${localGit.dirtyFileCount} files)`;
      } else if (localGit.behind > 0) {
        log(`[${repo.category.toUpperCase()}] Pulling ${localGit.behind} incoming commits for ${repo.name}...`, '⬇');
        const pullRes = spawnSync('git', ['-C', targetDir, 'pull', '--ff-only'], { encoding: 'utf-8' });
        if (pullRes.status === 0) {
          success(`Updated ${repo.name}`);
          itemResult.actionTaken = 'pulled';
          itemResult.status = 'PULLED_SUCCESS';
        } else {
          warn(`Could not fast-forward ${repo.name}: ${pullRes.stderr || 'merge required'}`);
          itemResult.actionTaken = 'pull failed';
          itemResult.status = 'PULL_CONFLICT_OR_DIVERGED';
        }
      } else if (localGit.ahead > 0) {
        log(`[${repo.category.toUpperCase()}] ${repo.name} is ahead of remote by ${localGit.ahead} commits.`, '⬆');
        itemResult.actionTaken = 'none';
        itemResult.status = `AHEAD (${localGit.ahead})`;
      } else {
        itemResult.actionTaken = 'none';
        itemResult.status = 'UP_TO_DATE';
      }
    }

    results.push(itemResult);
  }

  // Output formatting
  if (optJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Print Summary Table
  console.log(`\n${c.bold}${c.cyan}========================================================================================${c.reset}`);
  console.log(`${c.bold} ECOSYSTEM SYNC SUMMARY TABLE                                                          ${c.reset}`);
  console.log(`${c.cyan}========================================================================================${c.reset}`);
  console.log(
    `${c.bold}` +
    'Type'.padEnd(8) +
    'Repository'.padEnd(28) +
    'Version'.padEnd(12) +
    '@owd/core'.padEnd(15) +
    'Sync Status'.padEnd(25) +
    `${c.reset}`
  );
  console.log(`${c.gray}${'-'.repeat(88)}${c.reset}`);

  for (const r of results) {
    let statusColor = c.green;
    if (r.status.includes('DIRTY') || r.status.includes('AHEAD') || r.status.includes('BEHIND')) statusColor = c.yellow;
    if (r.status.includes('FAILED') || r.status.includes('MISSING')) statusColor = c.red;

    const readyBadge = r.readyFor4Alpha ? `${c.green}✔ 4.0${c.reset}` : `${c.dim}${r.coreDep || '-'}${c.reset}`;
    console.log(
      `${c.blue}${r.category.padEnd(8)}${c.reset}` +
      `${r.name.padEnd(28)}` +
      `${(r.version || '-').padEnd(12)}` +
      `${readyBadge.padEnd(24)}` +
      `${statusColor}${r.status}${c.reset}`
    );
  }

  console.log(`${c.cyan}========================================================================================${c.reset}`);

  // Rename preview if requested
  if (command === 'rename-preview') {
    console.log(`\n${c.bold}${c.magenta}=== PROSPECTIVE RENAMING PREVIEW (FOR 4.0.0-ALPHA.0) ===${c.reset}`);
    console.log(`${c.gray}Shows standard module/package naming under @owdproject namespace:${c.reset}\n`);
    for (const r of results) {
      let modernName = r.name;
      if (r.category === 'app' && r.name.startsWith('app-')) {
        modernName = `@owdproject/${r.name}`;
      } else if (r.category === 'theme' && r.name.startsWith('theme-')) {
        modernName = `@owdproject/${r.name}`;
      } else if ((r.category === 'module' || r.category === 'kit')) {
        modernName = `@owdproject/${r.name}`;
      }
      console.log(`  ${r.name.padEnd(28)} -> ${c.cyan}${modernName}${c.reset} (target: 4.0.0-alpha.0)`);
    }
    console.log('');
  }

  const clonedCount = results.filter(r => r.actionTaken.includes('cloned')).length;
  const pulledCount = results.filter(r => r.actionTaken === 'pulled').length;
  const upToDateCount = results.filter(r => r.status === 'UP_TO_DATE').length;
  const dirtyCount = results.filter(r => r.status.includes('DIRTY')).length;
  const aheadCount = results.filter(r => r.status.includes('AHEAD')).length;

  console.log(`\n${c.bold}Execution Stats:${c.reset}`);
  console.log(`- Total targets:     ${results.length}`);
  console.log(`- Cloned:            ${clonedCount}`);
  console.log(`- Pulled updates:    ${pulledCount}`);
  console.log(`- Already up to date:${upToDateCount}`);
  if (aheadCount > 0) console.log(`- Ahead of remote:   ${aheadCount}`);
  if (dirtyCount > 0) console.log(`- Dirty (uncommitted): ${dirtyCount}`);
  console.log('');
}

main().catch(err => {
  error(`Unhandled error: ${err.stack || err.message}`);
  process.exit(1);
});
