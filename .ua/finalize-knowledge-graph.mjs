import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = 'c:\\Users\\INDIA\\Desktop\\Project Ruhvi';
const uaDir = join(projectRoot, '.ua');

const assembledRaw = readFileSync(join(uaDir, 'intermediate/assembled-graph.json'), 'utf-8');
const assembled = JSON.parse(assembledRaw);

const layersRaw = readFileSync(join(uaDir, 'intermediate/layers.json'), 'utf-8');
const layers = JSON.parse(layersRaw);

const tourRaw = readFileSync(join(uaDir, 'intermediate/tour.json'), 'utf-8');
const tour = JSON.parse(tourRaw);

const scanRaw = readFileSync(join(uaDir, 'intermediate/scan-result.json'), 'utf-8');
const scan = JSON.parse(scanRaw);

const gitCommitHash = 'eadfc99aea0f67185aecb8826ca08fbb611dcd0a';
const analyzedAt = new Date().toISOString();

const knowledgeGraph = {
  metadata: {
    projectName: scan.projectName || 'Project Ruhvi',
    description: scan.description || 'Knowledge graph of Project Ruhvi',
    version: '1.0.0',
    gitCommitHash,
    analyzedAt,
    languages: scan.languages || [],
    frameworks: scan.frameworks || []
  },
  nodes: assembled.nodes || [],
  edges: assembled.edges || [],
  layers: layers || [],
  tour: tour || []
};

// Write knowledge-graph.json
writeFileSync(join(uaDir, 'knowledge-graph.json'), JSON.stringify(knowledgeGraph, null, 2), 'utf-8');
console.log(`Saved knowledge-graph.json (${knowledgeGraph.nodes.length} nodes, ${knowledgeGraph.edges.length} edges).`);

// Write meta.json
const meta = {
  gitCommitHash,
  analyzedAt,
  fileCount: scan.filesScanned || knowledgeGraph.nodes.filter(n => n.type === 'file').length,
  nodeCount: knowledgeGraph.nodes.length,
  edgeCount: knowledgeGraph.edges.length
};
writeFileSync(join(uaDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
console.log('Saved meta.json.');
