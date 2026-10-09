import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const projectRoot = 'c:\\Users\\INDIA\\Desktop\\Project Ruhvi';
const uaDir = join(projectRoot, '.ua');
const pluginRoot = join(projectRoot, '.agents');

const core = await import(pathToFileURL(join(pluginRoot, 'packages/core/dist/index.js')).href);
const { TreeSitterPlugin, PluginRegistry, builtinLanguageConfigs, registerAllParsers } = core;

const { analyzeFileWithOutcomes, buildResult } = await import(pathToFileURL(join(pluginRoot, 'skills/understand/extract-structure-result.mjs')).href);

const batchesRaw = readFileSync(join(uaDir, 'intermediate/batches.json'), 'utf-8');
const { batches } = JSON.parse(batchesRaw);

// Read scan-result.json to get full importMap
let scanImportMap = {};
try {
  const scanRaw = readFileSync(join(uaDir, 'intermediate/scan-result.json'), 'utf-8');
  const scanJson = JSON.parse(scanRaw);
  scanImportMap = scanJson.importMap || {};
} catch (e) {
  console.warn('Could not load scan-result importMap:', e.message);
}

console.log(`Initializing TreeSitter and parsers for ${batches.length} batches...`);
const tsConfigs = builtinLanguageConfigs.filter(c => c.treeSitter);
const tsPlugin = new TreeSitterPlugin(tsConfigs);
await tsPlugin.init();

const registry = new PluginRegistry();
registry.register(tsPlugin);
registerAllParsers(registry);

console.log('Analyzing batches and building nodes/edges...');
let totalFilesAnalyzed = 0;
let totalNodesGenerated = 0;
let totalEdgesGenerated = 0;

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  const batchIndex = batch.batchIndex ?? i;
  const batchFiles = batch.files;
  const batchImportData = batch.batchImportData ?? {};

  const batchNodes = [];
  const batchEdges = [];

  for (const file of batchFiles) {
    const absolutePath = join(projectRoot, file.path);
    let content;
    try {
      content = readFileSync(absolutePath, 'utf-8');
    } catch (err) {
      continue;
    }

    const lines = content.split('\n');
    const totalLines = content.endsWith('\n') ? Math.max(0, lines.length - 1) : lines.length;
    const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;

    const { analysis, callGraph, structureOutcome } = analyzeFileWithOutcomes(registry, file, content);

    // Determine node type and prefix
    let prefix = 'file';
    if (file.fileCategory === 'config') prefix = 'config';
    else if (file.fileCategory === 'docs') prefix = 'document';
    else if (file.fileCategory === 'infra') prefix = 'pipeline';
    else if (file.fileCategory === 'data') prefix = 'table';

    const fileNodeId = `${prefix}:${file.path}`;
    const complexity = totalLines > 300 ? 'complex' : totalLines > 80 ? 'moderate' : 'simple';

    const fileNode = {
      id: fileNodeId,
      name: basename(file.path),
      type: prefix,
      filePath: file.path,
      summary: `${file.language} ${file.fileCategory} file (${totalLines} lines)`,
      complexity,
      tags: [file.language, file.fileCategory].filter(Boolean)
    };
    batchNodes.push(fileNode);

    // Process imports edges
    const importsList = batchImportData[file.path] || scanImportMap[file.path] || [];
    for (const impTarget of importsList) {
      if (impTarget && impTarget !== file.path) {
        batchEdges.push({
          source: fileNodeId,
          target: `file:${impTarget}`,
          type: 'imports'
        });
      }
    }

    if (!analysis) continue;

    // Functions
    if (analysis.functions) {
      for (const fn of analysis.functions) {
        const fnId = `function:${file.path}:${fn.name}`;
        batchNodes.push({
          id: fnId,
          name: fn.name,
          type: 'function',
          filePath: file.path,
          parentId: fileNodeId,
          summary: `Function ${fn.name}`,
          complexity: 'simple'
        });
        batchEdges.push({ source: fileNodeId, target: fnId, type: 'contains' });
      }
    }

    // Classes
    if (analysis.classes) {
      for (const cls of analysis.classes) {
        const clsId = `class:${file.path}:${cls.name}`;
        batchNodes.push({
          id: clsId,
          name: cls.name,
          type: 'class',
          filePath: file.path,
          parentId: fileNodeId,
          summary: `Class ${cls.name}`,
          complexity: 'moderate'
        });
        batchEdges.push({ source: fileNodeId, target: clsId, type: 'contains' });
      }
    }

    // Definitions (SQL tables/types/etc.)
    if (analysis.definitions) {
      for (const def of analysis.definitions) {
        const defId = `table:${file.path}:${def.name}`;
        batchNodes.push({
          id: defId,
          name: def.name,
          type: 'table',
          filePath: file.path,
          parentId: fileNodeId,
          summary: `Table definition ${def.name}`,
          complexity: 'simple'
        });
        batchEdges.push({ source: fileNodeId, target: defId, type: 'contains' });
      }
    }

    // Endpoints
    if (analysis.endpoints) {
      for (const ep of analysis.endpoints) {
        const epId = `endpoint:${file.path}:${ep.method || 'GET'}:${ep.path}`;
        batchNodes.push({
          id: epId,
          name: `${ep.method || 'GET'} ${ep.path}`,
          type: 'endpoint',
          filePath: file.path,
          parentId: fileNodeId,
          summary: `API Endpoint ${ep.method || 'GET'} ${ep.path}`,
          complexity: 'simple'
        });
        batchEdges.push({ source: fileNodeId, target: epId, type: 'contains' });
      }
    }

    // Call graph edges
    if (callGraph) {
      for (const call of callGraph) {
        if (call.caller && call.callee) {
          batchEdges.push({
            source: `function:${file.path}:${call.caller}`,
            target: `function:${file.path}:${call.callee}`,
            type: 'calls'
          });
        }
      }
    }
  }

  totalFilesAnalyzed += batchFiles.length;
  totalNodesGenerated += batchNodes.length;
  totalEdgesGenerated += batchEdges.length;

  const batchOutput = {
    batchIndex,
    batchFiles,
    nodes: batchNodes,
    edges: batchEdges
  };

  writeFileSync(
    join(uaDir, `intermediate/batch-${batchIndex}.json`),
    JSON.stringify(batchOutput, null, 2),
    'utf-8'
  );

  if ((i + 1) % 10 === 0 || i === batches.length - 1) {
    console.log(`Processed ${i + 1}/${batches.length} batches (${totalNodesGenerated} nodes, ${totalEdgesGenerated} edges)...`);
  }
}

console.log(`Batch analysis & graph building complete. Nodes: ${totalNodesGenerated}, Edges: ${totalEdgesGenerated}`);
