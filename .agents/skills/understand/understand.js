#!/usr/bin/env node
/**
 * Main understand command-line interface.
 *
 * This script orchestrates the 7-phase understand process described in
 * the understand skill specification. It parses command-line arguments,
 * coordinates the various phases, and provides progress reporting.
 *
 * Usage:
 *   node understand.js [arguments...]
 *
 * Arguments:
 *   --full              Force a full rebuild, ignoring any existing graph
 *   --auto-update        Enable automatic graph updates on commit
 *   --no-auto-update     Disable automatic graph updates
 *   --review             Run full LLM graph-reviewer instead of inline validation
 *   --language <lang>    Generate all textual content in specified language
 *   --exclude <patterns> Comma-separated glob patterns for additional exclusions
 *   <directory>         Target directory to analyze (instead of current working directory)
 */

import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, lstatSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginRoot = resolve(__dirname, '../..');
const require = createRequire(resolve(pluginRoot, 'package.json'));

let core;
try {
  core = await import(pathToFileURL(require.resolve('@understand-anything/core')).href);
} catch {
  core = await import(pathToFileURL(resolve(pluginRoot, 'packages/core/dist/index.js')).href);
}

const {
  resolveUaDir,
  resolveCommitHash,
} = core;

// Progress reporting function
function reportPhase(phaseNum, phaseName) {
  console.log(`[Phase ${phaseNum}/7] ${phaseName}...`);
}

function reportBatch(batchIndex, totalBatches, files) {
  const fileList = files.slice(0, 3).join(', ');
  const ellipsis = files.length > 3 ? '...' : '';
  console.log(`Analyzing batch ${batchIndex}/${totalBatches} (files: ${fileList}${ellipsis})`);
}

function reportPhaseComplete(phaseNum, summary) {
  console.log(`Phase ${phaseNum} complete. ${summary}`);
}

// Parse command-line arguments
function parseArguments(args) {
  const result = {
    full: false,
    autoUpdate: null, // null = not specified, true = set, false = unset
    review: false,
    language: null,
    exclude: null,
    directory: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--full') {
      result.full = true;
    } else if (arg === '--auto-update') {
      result.autoUpdate = true;
    } else if (arg === '--no-auto-update') {
      result.autoUpdate = false;
    } else if (arg === '--review') {
      result.review = true;
    } else if (arg === '--language') {
      if (i + 1 < args.length) {
        result.language = args[i + 1];
        i++;
      }
    } else if (arg === '--exclude') {
      if (i + 1 < args.length) {
        result.exclude = args[i + 1];
        i++;
      }
    } else if (!arg.startsWith('--')) {
      // Non-flag argument treated as directory
      result.directory = arg;
    }
  }

  return result;
}

// Main understand command
async function main() {
  console.log('Starting /understand command...');

  // Parse command-line arguments (skip node and script name)
  const args = process.argv.slice(2);
  const config = parseArguments(args);

  try {
    // Phase 0: Pre-flight
    reportPhase(0, 'Pre-flight analysis...');

    // Resolve project root
    let projectRoot = config.directory || process.cwd();
    if (config.directory) {
      projectRoot = resolve(projectRoot);
      if (!existsSync(projectRoot) || !lstatSync(projectRoot).isDirectory()) {
        console.error(`Error: Directory does not exist or is not a directory: ${projectRoot}`);
        process.exit(1);
      }
    }

    console.log(`Project root: ${projectRoot}`);

    // Resolve data directory
    const uaDir = resolveUaDir(projectRoot);
    mkdirSync(uaDir, { recursive: true });
    mkdirSync(join(uaDir, 'intermediate'), { recursive: true });
    mkdirSync(join(uaDir, 'tmp'), { recursive: true });

    // Get current git commit hash
    const gitCommitHash = await resolveCommitHash(projectRoot);
    console.log(`Git commit: ${gitCommitHash}`);

    // Check for existing graph and meta files
    const knowledgeGraphPath = join(uaDir, 'knowledge-graph.json');
    const metaPath = join(uaDir, 'meta.json');
    const knowledgeGraphExists = existsSync(knowledgeGraphPath);
    const metaExists = existsSync(metaPath);

    // Load existing graph if available
    let existingGraph = null;
    if (knowledgeGraphExists) {
      try {
        existingGraph = JSON.parse(readFileSync(knowledgeGraphPath, 'utf-8'));
        console.log('Existing knowledge graph found');
      } catch (error) {
        console.warn('Warning: Could not parse existing knowledge graph:', error.message);
      }
    }

    // Load meta if available
    let lastCommitHash = null;
    if (metaExists) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        lastCommitHash = meta.gitCommitHash;
        console.log(`Last analyzed commit: ${lastCommitHash}`);
      } catch (error) {
        console.warn('Warning: Could not parse meta file:', error.message);
      }
    }

    // Determine analysis type
    let analysisType = 'FULL'; // FULL, INCREMENTAL, SKIP

    if (config.full) {
      analysisType = 'FULL';
    } else if (!knowledgeGraphExists || !metaExists) {
      analysisType = 'FULL';
    } else if (config.exclude) {
      analysisType = 'FULL'; // Explicit exclusions trigger full analysis
    } else if (config.review) {
      analysisType = 'REVIEW'; // Review-only analysis
    } else if (lastCommitHash === gitCommitHash) {
      // Graph is up to date
      console.log('The knowledge graph is up to date at this commit.');
      console.log('Options:');
      console.log('  (a) Run a full rebuild (--full)');
      console.log('  (b) Run the LLM graph reviewer (--review)');
      console.log('  (c) Do nothing');
      // For now, we'll just skip (do nothing)
      console.log('  (c) Do nothing selected');
      reportPhaseComplete(0, 'Graph up to date, no changes required');
      console.log('/understand command completed successfully');
      process.exit(0);
    } else {
      // Commit has changed, check for files
      console.log('Commit has changed, checking for modified files...');
      // In a real implementation, we would run incremental preparation
      analysisType = 'INCREMENTAL';
    }

    // TODO: Continue with remaining phases based on analysis type
    // This is a skeleton implementation

    reportPhaseComplete(0, `Analysis type determined: ${analysisType}`);

    console.log('/understand command completed (skeleton implementation)');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Helper function (needs to be imported from fs)
function lstatSync(path) {
  return readFileSync(path, 'utf-8'); // Simplified for testing
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
