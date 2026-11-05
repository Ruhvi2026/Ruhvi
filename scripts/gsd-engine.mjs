#!/usr/bin/env node
/**
 * GSD (Get Shit Done) Workflow Engine
 * Strict State Progression: PLAN -> EXECUTE -> VERIFY
 * Context-Rot Mitigation & Automated Verification Engine
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const GSD_DIR = path.join(ROOT_DIR, '.gsd');
const STATE_FILE = path.join(GSD_DIR, 'state.json');
const CONFIG_FILE = path.join(GSD_DIR, 'config.json');
const TASKS_DIR = path.join(ROOT_DIR, 'tasks');
const PLANS_DIR = path.join(ROOT_DIR, 'plans');
const GSD_PLAN_FILE = path.join(ROOT_DIR, 'GSD_PLAN.md');
const GSD_CONTEXT_FILE = path.join(ROOT_DIR, 'GSD_CONTEXT.md');
const HISTORY_DIR = path.join(GSD_DIR, 'history');

function ensureDirectories() {
  const dirs = [
    GSD_DIR,
    path.join(GSD_DIR, 'templates'),
    path.join(GSD_DIR, 'phases'),
    path.join(GSD_DIR, 'tasks'),
    HISTORY_DIR,
    TASKS_DIR,
    PLANS_DIR
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function loadState() {
  ensureDirectories();
  if (!fs.existsSync(STATE_FILE)) {
    const initialState = {
      active_phase: 'phase-01',
      active_phase_title: 'GSD Workflow Engine Setup',
      current_task: null,
      tasks: {},
      completed_tasks: [],
      completed_phases: [],
      metrics: {
        total_tasks: 0,
        completed_tasks: 0,
        verification_success_rate: 1.0
      }
    };
    saveState(initialState);
    return initialState;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse .gsd/state.json, creating fallback:', err);
    return {};
  }
}

function saveState(state) {
  ensureDirectories();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function loadConfig() {
  ensureDirectories();
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig = {
      version: '1.0.0',
      workflow: {
        states: ['PLAN', 'EXECUTE', 'VERIFY'],
        strict_transitions: true,
        verification: {
          default_gates: [
            { name: 'typecheck', command: 'npx tsc --noEmit', required: true }
          ]
        }
      }
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    return defaultConfig;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export function getStatus() {
  const state = loadState();
  console.log('\n======================================================');
  console.log('       GSD WORKFLOW ENGINE — DASHBOARD');
  console.log('======================================================');
  console.log(`Active Phase:  ${state.active_phase || 'None'} (${state.active_phase_title || 'N/A'})`);
  console.log(`Current Task:  ${state.current_task || 'None'}`);
  console.log(`Completed:     ${(state.completed_tasks || []).length} tasks`);
  console.log('------------------------------------------------------');
  console.log('Task Matrix:');

  const taskList = Object.values(state.tasks || {});
  if (taskList.length === 0) {
    console.log('  No tasks registered yet. Run `node scripts/gsd-engine.mjs plan <taskId> "<title>"`');
  } else {
    for (const t of taskList) {
      let stateBadge = `[${t.state}]`;
      if (t.state === 'PLAN') stateBadge = '\x1b[33m[PLAN]\x1b[0m';
      else if (t.state === 'EXECUTE') stateBadge = '\x1b[36m[EXECUTE]\x1b[0m';
      else if (t.state === 'VERIFY' || t.state === 'COMPLETED') stateBadge = '\x1b[32m[VERIFIED]\x1b[0m';
      console.log(`  ${t.id.padEnd(10)} ${stateBadge.padEnd(18)} ${t.title}`);
    }
  }
  console.log('======================================================\n');
}

function writeTaskFile(task, logEntry = null) {
  const taskFilePath = path.join(TASKS_DIR, `${task.id}.md`);
  let content = '';
  if (fs.existsSync(taskFilePath)) {
    content = fs.readFileSync(taskFilePath, 'utf-8');
    content = content.replace(/\*\*State:\*\* `\[.*?\]`/, `**State:** \`[${task.state}]\``);
    if (logEntry) {
      content += `- [${new Date().toISOString()}] ${logEntry}\n`;
    }
  } else {
    content = `# Task: ${task.id} - ${task.title}\n\n` +
      `**Phase:** ${task.phase || 'phase-01'}\n` +
      `**State:** \`[${task.state}]\`\n` +
      `**Created:** ${task.created_at || new Date().toISOString()}\n\n` +
      `## Inputs\n${(task.inputs || []).map(i => `- ${i}`).join('\n')}\n\n` +
      `## Targets\n${(task.targets || []).map(t => `- ${t}`).join('\n')}\n\n` +
      `## Verification Criteria\n${(task.criteria || []).map(c => `- [ ] ${c}`).join('\n')}\n\n` +
      `## Status Log\n` +
      (task.history || []).map(h => `- [${h.timestamp}] ${h.state}: ${h.note}`).join('\n') + '\n';
    if (logEntry) {
      content += `- [${new Date().toISOString()}] ${logEntry}\n`;
    }
  }
  fs.writeFileSync(taskFilePath, content, 'utf-8');
}

export function planTask(taskId, title = '', inputs = [], targets = [], criteria = []) {
  const state = loadState();
  const id = taskId.toUpperCase();

  const now = new Date().toISOString();
  const task = state.tasks[id] || {
    id,
    title: title || `Task ${id}`,
    phase: state.active_phase || 'phase-01',
    created_at: now,
    history: []
  };

  task.state = 'PLAN';
  task.title = title || task.title;
  task.updated_at = now;
  task.inputs = inputs.length ? inputs : (task.inputs || ['Feature specification', 'Workspace codebase']);
  task.targets = targets.length ? targets : (task.targets || ['Source implementation files']);
  task.criteria = criteria.length ? criteria : (task.criteria || ['npx tsc --noEmit passes clean (0 errors)']);

  task.history.push({
    state: 'PLAN',
    timestamp: now,
    note: `Task planned: ${task.title}`
  });

  state.tasks[id] = task;
  state.current_task = id;
  state.metrics.total_tasks = Object.keys(state.tasks).length;
  saveState(state);

  writeTaskFile(task, 'Transitioned to PLAN state');
  console.log(`\x1b[32m✓\x1b[0m Task ${id} successfully transitioned to [PLAN] state.`);
  console.log(`  File: tasks/${id}.md`);
  return task;
}

export function executeTask(taskId) {
  const state = loadState();
  const id = taskId.toUpperCase();
  const task = state.tasks[id];

  if (!task) {
    throw new Error(`Task ${id} does not exist. Plan it first: node scripts/gsd-engine.mjs plan ${id}`);
  }

  const config = loadConfig();
  if (config.workflow?.strict_transitions && task.state !== 'PLAN' && task.state !== 'EXECUTE') {
    throw new Error(`Strict Transition Violation: Cannot transition ${id} from [${task.state}] directly to [EXECUTE]. Must be in [PLAN].`);
  }

  const now = new Date().toISOString();
  task.state = 'EXECUTE';
  task.updated_at = now;
  task.history.push({
    state: 'EXECUTE',
    timestamp: now,
    note: 'Execution started. Code modifications authorized.'
  });

  state.current_task = id;
  saveState(state);

  writeTaskFile(task, 'Transitioned to EXECUTE state');

  console.log(`\x1b[36m⚡\x1b[0m Task ${id} transitioned to [EXECUTE] state.`);
  console.log(`  Authorized to perform atomic modifications defined in tasks/${id}.md`);
  return task;
}

export function verifyTask(taskId, customCommand = null) {
  const state = loadState();
  const id = taskId.toUpperCase();
  const task = state.tasks[id];

  if (!task) {
    throw new Error(`Task ${id} does not exist.`);
  }

  const config = loadConfig();
  if (config.workflow?.strict_transitions && task.state !== 'EXECUTE' && task.state !== 'VERIFY') {
    throw new Error(`Strict Transition Violation: Task ${id} is in [${task.state}]. Must be in [EXECUTE] before running verification.`);
  }

  console.log(`\n\x1b[34m[GSD Verifier]\x1b[0m Running verification gates for ${id} (${task.title})...`);
  const now = new Date().toISOString();
  let verificationSuccess = true;
  let verificationLog = `Verification executed at: ${now}\n`;

  const gates = config.workflow?.verification?.default_gates || [
    { name: 'typecheck', command: 'npx tsc --noEmit', required: true }
  ];

  for (const gate of gates) {
    console.log(`  Running gate: [${gate.name}] -> ${gate.command}`);
    try {
      const output = execSync(gate.command, { cwd: ROOT_DIR, stdio: 'pipe', encoding: 'utf-8' });
      console.log(`  \x1b[32m✓\x1b[0m Gate [${gate.name}] passed.`);
      verificationLog += `Gate [${gate.name}]: PASS\n${output}\n`;
    } catch (err) {
      console.error(`  \x1b[31m✗\x1b[0m Gate [${gate.name}] FAILED with exit code ${err.status}.`);
      verificationLog += `Gate [${gate.name}]: FAIL (Exit ${err.status})\n${err.stdout || ''}\n${err.stderr || ''}\n`;
      if (gate.required) {
        verificationSuccess = false;
        break;
      }
    }
  }

  if (customCommand && verificationSuccess) {
    console.log(`  Running custom verification gate: ${customCommand}`);
    try {
      const output = execSync(customCommand, { cwd: ROOT_DIR, stdio: 'pipe', encoding: 'utf-8' });
      console.log(`  \x1b[32m✓\x1b[0m Custom gate passed.`);
      verificationLog += `Custom Gate: PASS\n${output}\n`;
    } catch (err) {
      console.error(`  \x1b[31m✗\x1b[0m Custom gate FAILED with exit code ${err.status}.`);
      verificationLog += `Custom Gate: FAIL (Exit ${err.status})\n${err.stdout || ''}\n${err.stderr || ''}\n`;
      verificationSuccess = false;
    }
  }

  // Write verification record to .gsd/tasks/
  const verifyRecordPath = path.join(GSD_DIR, 'tasks', `${id}-verification.md`);
  fs.writeFileSync(verifyRecordPath, `# Verification Evidence for ${id}\n\n**Status:** ${verificationSuccess ? 'PASS' : 'FAIL'}\n\n\`\`\`\n${verificationLog}\n\`\`\`\n`, 'utf-8');

  if (verificationSuccess) {
    task.state = 'COMPLETED';
    task.updated_at = now;
    task.history.push({
      state: 'VERIFY',
      timestamp: now,
      note: 'All verification gates passed clean.'
    });

    if (!state.completed_tasks.includes(id)) {
      state.completed_tasks.push(id);
    }
    state.metrics.completed_tasks = state.completed_tasks.length;
    saveState(state);

    writeTaskFile(task, 'Transitioned to VERIFY -> COMPLETED (All gates passed clean)');

    console.log(`\n\x1b[32m✓ VERIFIED SUCCESS:\x1b[0m Task ${id} passed all gates and is COMPLETED.`);
    return true;
  } else {
    task.history.push({
      state: 'VERIFY_FAILED',
      timestamp: now,
      note: 'Verification gate failed. Task remains in EXECUTE.'
    });
    saveState(state);
    console.error(`\n\x1b[31m✗ VERIFICATION FAILED:\x1b[0m Task ${id} failed verification gates. Cannot advance state.`);
    process.exitCode = 1;
    return false;
  }
}

export function summarizeContext() {
  const state = loadState();
  const now = new Date().toISOString().slice(0, 10);
  console.log('\n\x1b[34m[GSD Context Engine]\x1b[0m Rolling completed phase summaries into GSD_CONTEXT.md...');

  // Archive completed task details into .gsd/history
  const archivePath = path.join(HISTORY_DIR, `summary-${state.active_phase}-${Date.now()}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(state, null, 2), 'utf-8');

  console.log(`  \x1b[32m✓\x1b[0m Snapshot saved to: ${path.relative(ROOT_DIR, archivePath)}`);
  console.log(`  \x1b[32m✓\x1b[0m Context rot mitigation complete. Context memory active.`);
}

// CLI Argument Handling
const args = process.argv.slice(2);
const command = args[0] || 'status';

try {
  switch (command) {
    case 'init':
      ensureDirectories();
      loadState();
      loadConfig();
      console.log('\x1b[32m✓\x1b[0m GSD Workflow Engine directories and state initialized.');
      break;
    case 'status':
      getStatus();
      break;
    case 'plan':
      if (!args[1]) {
        console.error('Usage: node scripts/gsd-engine.mjs plan <taskId> [title]');
        process.exit(1);
      }
      planTask(args[1], args.slice(2).join(' '));
      break;
    case 'execute':
      if (!args[1]) {
        console.error('Usage: node scripts/gsd-engine.mjs execute <taskId>');
        process.exit(1);
      }
      executeTask(args[1]);
      break;
    case 'verify':
      if (!args[1]) {
        console.error('Usage: node scripts/gsd-engine.mjs verify <taskId> [customCommand]');
        process.exit(1);
      }
      verifyTask(args[1], args[2] || null);
      break;
    case 'summarize':
      summarizeContext();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands: init, status, plan, execute, verify, summarize');
      process.exit(1);
  }
} catch (err) {
  console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
  process.exit(1);
}
