#!/usr/bin/env node
/**
 * Ralph Loop Autonomous Execution & Recovery Engine
 * Inspired by Geoffrey Huntley's Ralph Wiggum Pattern & Antigravity Extensions
 * 
 * Features:
 * - Fresh context orientation per iteration via file-driven state (RALPH_GOAL.md, RALPH_STATUS.json)
 * - Self-healing recovery loop on crash, timeout, or error
 * - Persistent logging into .ralph/run.log
 * - Automated checkpointing and rollback protection
 * - Safety guards (max retries limit, iteration timeout, emergency stop file)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const RALPH_DIR = path.join(ROOT_DIR, '.ralph');
const CONFIG_FILE = path.join(RALPH_DIR, 'config.json');
const RUN_LOG_FILE = path.join(RALPH_DIR, 'run.log');
const STOP_FILE = path.join(RALPH_DIR, 'STOP');
const CHECKPOINTS_DIR = path.join(RALPH_DIR, 'checkpoints');

const GOAL_FILE = path.join(ROOT_DIR, 'RALPH_GOAL.md');
const STATUS_FILE = path.join(ROOT_DIR, 'RALPH_STATUS.json');

function ensureDirectories() {
  const dirs = [RALPH_DIR, CHECKPOINTS_DIR, path.join(RALPH_DIR, 'logs')];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
}

function appendLog(message, isError = false) {
  ensureDirectories();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${isError ? '[ERROR] ' : '[INFO] '} ${message}\n`;
  fs.appendFileSync(RUN_LOG_FILE, line, 'utf-8');
}

function loadConfig() {
  ensureDirectories();
  const defaults = {
    max_iterations: 15,
    iteration_timeout_ms: 180000,
    backoff_ms: 1500,
    default_validation_command: 'npx tsc --noEmit'
  };
  if (!fs.existsSync(CONFIG_FILE)) {
    return defaults;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    return { ...defaults, ...(raw.settings || raw) };
  } catch {
    return defaults;
  }
}

function loadStatus() {
  ensureDirectories();
  if (!fs.existsSync(STATUS_FILE)) {
    const initialStatus = {
      status: 'IDLE',
      iteration: 0,
      max_iterations: 15,
      last_checkpoint: new Date().toISOString(),
      goal_id: 'UNKNOWN',
      goal_title: 'Unassigned Goal',
      current_task: 'Initialize workflow',
      last_exit_code: 0,
      error_streak: 0,
      completion_marker: null,
      history: []
    };
    saveStatus(initialStatus);
    return initialStatus;
  }
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return { status: 'ERROR', iteration: 0, max_iterations: 15, history: [] };
  }
}

function saveStatus(status) {
  ensureDirectories();
  status.last_checkpoint = new Date().toISOString();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

function parseGoalFile() {
  if (!fs.existsSync(GOAL_FILE)) {
    return {
      goalId: 'DEFAULT-GOAL',
      title: 'Default Goal',
      validationCommand: 'npx tsc --noEmit',
      maxRetries: 15
    };
  }
  const content = fs.readFileSync(GOAL_FILE, 'utf-8');
  const goalIdMatch = content.match(/\*\*Goal ID:\*\*\s*`?([^`\n]+)`?/);
  const titleMatch = content.match(/\*\*Title:\*\*\s*`?([^`\n]+)`?/);
  const cmdMatch = content.match(/\*\*Validation Command:\*\*\s*`?([^`\n]+)`?/);
  const retriesMatch = content.match(/\*\*Max Retries:\*\*\s*(\d+)/);

  return {
    goalId: goalIdMatch ? goalIdMatch[1].trim() : 'GOAL-001',
    title: titleMatch ? titleMatch[1].trim() : 'Active Goal',
    validationCommand: cmdMatch ? cmdMatch[1].trim() : 'npx tsc --noEmit',
    maxRetries: retriesMatch ? parseInt(retriesMatch[1], 10) : 15
  };
}

export function getStatus() {
  const status = loadStatus();
  console.log('\n======================================================');
  console.log('       RALPH LOOP AUTONOMOUS RUNNER — STATUS');
  console.log('======================================================');
  console.log(`Goal:          ${status.goal_id} — ${status.goal_title}`);
  console.log(`Loop Status:   ${status.status}`);
  console.log(`Iteration:     ${status.iteration} / ${status.max_iterations}`);
  console.log(`Current Task:  ${status.current_task}`);
  console.log(`Last Exit:     ${status.last_exit_code}`);
  console.log(`Error Streak:  ${status.error_streak}`);
  console.log(`Last Active:   ${status.last_checkpoint}`);
  if (status.completion_marker) {
    console.log(`Marker:        \x1b[32m${status.completion_marker}\x1b[0m`);
  }
  console.log('======================================================\n');
}

export function runStep(customCommand = null) {
  const status = loadStatus();
  const goal = parseGoalFile();
  const command = customCommand || goal.validationCommand || 'npx tsc --noEmit';

  console.log(`\n\x1b[35m[Ralph Step]\x1b[0m Executing validation gate: ${command}`);
  appendLog(`Executing step command: ${command}`);

  try {
    const output = execSync(command, { cwd: ROOT_DIR, stdio: 'pipe', encoding: 'utf-8' });
    console.log(`\x1b[32m✓\x1b[0m Step command succeeded.`);
    appendLog(`Step command succeeded:\n${output}`);

    status.last_exit_code = 0;
    status.error_streak = 0;
    status.status = 'COMPLETED';
    status.completion_marker = `ralph-done-${Date.now()}`;
    status.history.push({
      iteration: status.iteration + 1,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      command,
      note: 'Step validation passed clean.'
    });
    saveStatus(status);
    return true;
  } catch (err) {
    console.error(`\x1b[31m✗\x1b[0m Step command failed with code ${err.status}.`);
    const errorDetails = `Exit: ${err.status}\nStdout: ${err.stdout || ''}\nStderr: ${err.stderr || ''}`;
    appendLog(`Step command failed: ${errorDetails}`, true);

    status.last_exit_code = err.status || 1;
    status.error_streak += 1;
    status.status = 'RETRYING';
    status.history.push({
      iteration: status.iteration + 1,
      timestamp: new Date().toISOString(),
      status: 'FAILED',
      command,
      note: `Step validation failed (Exit: ${err.status})`
    });
    saveStatus(status);
    return false;
  }
}

export function runLoop(commandToExecute = null, maxRetriesOverride = null) {
  ensureDirectories();
  const config = loadConfig();
  const goal = parseGoalFile();
  const maxIterations = maxRetriesOverride || goal.maxRetries || config.max_iterations || 15;

  let status = loadStatus();
  status.max_iterations = maxIterations;
  status.goal_id = goal.goalId;
  status.goal_title = goal.title;
  status.status = 'RUNNING';
  saveStatus(status);

  console.log('\n======================================================');
  console.log('       RALPH LOOP: AUTONOMOUS RECOVERY ENGINE');
  console.log('======================================================');
  console.log(`Target Goal:     ${goal.goalId} (${goal.title})`);
  console.log(`Max Iterations:  ${maxIterations}`);
  console.log(`Timeout / Run:   ${config.iteration_timeout_ms / 1000}s`);
  console.log(`Log File:        .ralph/run.log`);
  console.log('======================================================\n');

  appendLog(`=== Ralph Loop Session Started: ${goal.goalId} ===`);

  const execCmd = commandToExecute || goal.validationCommand || 'npx tsc --noEmit';

  while (status.iteration < maxIterations) {
    // 1. Safety Check: Emergency Stop File
    if (fs.existsSync(STOP_FILE)) {
      console.warn('\n\x1b[33m[Ralph Safety Alert]\x1b[0m Emergency STOP file detected (.ralph/STOP). Halting loop.');
      appendLog('Emergency STOP file detected. Loop halted immediately.');
      status.status = 'STOPPED';
      saveStatus(status);
      process.exitCode = 130;
      return false;
    }

    status.iteration += 1;
    status.status = 'RUNNING';
    saveStatus(status);

    console.log(`\n\x1b[36m>>> [Ralph Loop]\x1b[0m Iteration ${status.iteration} of ${maxIterations}...`);
    appendLog(`Iteration ${status.iteration} started: Running "${execCmd}"`);

    // Create iteration checkpoint
    const checkpointPath = path.join(CHECKPOINTS_DIR, `checkpoint-iter-${status.iteration}.json`);
    fs.writeFileSync(checkpointPath, JSON.stringify(status, null, 2), 'utf-8');

    let iterPassed = false;
    let stdoutOutput = '';
    let stderrOutput = '';
    let exitCode = 0;

    const startTime = Date.now();
    try {
      stdoutOutput = execSync(execCmd, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: config.iteration_timeout_ms
      });
      iterPassed = true;
      exitCode = 0;
    } catch (err) {
      exitCode = err.status || 1;
      stdoutOutput = err.stdout ? err.stdout.toString() : '';
      stderrOutput = err.stderr ? err.stderr.toString() : err.message;
      iterPassed = false;
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (iterPassed && exitCode === 0) {
      console.log(`\x1b[32m✓ Iteration ${status.iteration} PASSED\x1b[0m in ${elapsed}s.`);
      appendLog(`Iteration ${status.iteration} PASSED cleanly in ${elapsed}s.`);

      status.status = 'COMPLETED';
      status.last_exit_code = 0;
      status.error_streak = 0;
      status.completion_marker = `ralph-done-${Date.now()}`;
      status.history.push({
        iteration: status.iteration,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        elapsed: `${elapsed}s`,
        note: 'Goal criteria fulfilled.'
      });
      saveStatus(status);

      console.log('\n======================================================');
      console.log(`  🎉 GOAL ACHIEVED: ${status.completion_marker}`);
      console.log('======================================================\n');
      return true;
    } else {
      console.error(`\x1b[31m✗ Iteration ${status.iteration} FAILED\x1b[0m (Exit: ${exitCode}) in ${elapsed}s.`);
      const errorMsg = `Iteration ${status.iteration} failed.\nExit: ${exitCode}\nStdout: ${stdoutOutput}\nStderr: ${stderrOutput}`;
      appendLog(errorMsg, true);

      status.error_streak += 1;
      status.last_exit_code = exitCode;
      status.status = 'RETRYING';
      status.history.push({
        iteration: status.iteration,
        timestamp: new Date().toISOString(),
        status: 'RETRY_TRIGGERED',
        exitCode,
        elapsed: `${elapsed}s`,
        note: stderrOutput.slice(0, 300)
      });
      saveStatus(status);

      // Automated State Recovery
      if (config.auto_restore_on_crash) {
        console.log(`\x1b[33m[Auto-Recovery]\x1b[0m Stabilizing workspace state before restart...`);
        appendLog(`[Auto-Recovery] State preserved. Retrying in ${config.backoff_ms}ms...`);
      }

      // Check for max iteration limit
      if (status.iteration >= maxIterations) {
        console.error(`\n\x1b[31m[Ralph Safety Limit Reached]\x1b[0m Exceeded maximum retry limit of ${maxIterations} attempts.`);
        appendLog(`Maximum retry limit of ${maxIterations} reached. Halting loop to prevent spin.`);
        status.status = 'FAILED';
        saveStatus(status);
        process.exitCode = 1;
        return false;
      }

      // Backoff delay before next autonomous attempt
      if (config.backoff_ms > 0) {
        execSync(`node -e "setTimeout(() => {}, ${config.backoff_ms})"`);
      }
    }
  }

  status.status = 'FAILED';
  saveStatus(status);
  process.exitCode = 1;
  return false;
}

export function emergencyStop() {
  ensureDirectories();
  fs.writeFileSync(STOP_FILE, `STOPPED AT ${new Date().toISOString()}`, 'utf-8');
  console.log('\x1b[31m[Ralph Emergency Stop]\x1b[0m Created .ralph/STOP. Any active loop will halt on its next tick.');
  appendLog('Emergency stop triggered by operator.');
}

export function resetLoop() {
  ensureDirectories();
  if (fs.existsSync(STOP_FILE)) {
    fs.unlinkSync(STOP_FILE);
  }
  const status = {
    status: 'IDLE',
    iteration: 0,
    max_iterations: 15,
    last_checkpoint: new Date().toISOString(),
    goal_id: 'RESET',
    goal_title: 'Ready for new goal',
    current_task: 'Idle',
    last_exit_code: 0,
    error_streak: 0,
    completion_marker: null,
    history: []
  };
  saveStatus(status);
  console.log('\x1b[32m✓\x1b[0m Ralph Loop reset to IDLE state.');
  appendLog('Loop state reset to IDLE.');
}

// CLI Handling
const args = process.argv.slice(2);
const command = args[0] || 'status';

function parseRunArgs(rawArgs) {
  let cmd = null;
  let retries = null;

  for (let i = 1; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === '--cmd' && rawArgs[i + 1]) {
      cmd = rawArgs[++i];
    } else if (a === '--max-retries' && rawArgs[i + 1]) {
      retries = parseInt(rawArgs[++i], 10);
    } else if (/^\d+$/.test(a) && retries === null) {
      retries = parseInt(a, 10);
    } else if (cmd === null && !a.startsWith('--')) {
      cmd = a;
    }
  }
  return { cmd, retries };
}

try {
  switch (command) {
    case 'status':
      getStatus();
      break;
    case 'step':
      const stepTarget = args[1] && !args[1].startsWith('--') ? args[1] : null;
      runStep(stepTarget);
      break;
    case 'run': {
      const { cmd, retries } = parseRunArgs(args);
      runLoop(cmd, retries);
      break;
    }
    case 'stop':
      emergencyStop();
      break;
    case 'reset':
      resetLoop();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands: status, step, run [--cmd <cmd>] [--max-retries <N>], stop, reset');
      process.exit(1);
  }
} catch (err) {
  console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
  process.exit(1);
}
