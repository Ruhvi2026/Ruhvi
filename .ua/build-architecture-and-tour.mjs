import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = 'c:\\Users\\INDIA\\Desktop\\Project Ruhvi';
const uaDir = join(projectRoot, '.ua');

const graphRaw = readFileSync(join(uaDir, 'intermediate/assembled-graph.json'), 'utf-8');
const graph = JSON.parse(graphRaw);
const nodes = graph.nodes || [];

// Categorize nodes into layers
const layerBins = {
  'layer:frontend': {
    id: 'layer:frontend',
    name: 'Frontend & UI Components',
    description: 'User interface components, pages, hooks, and React state management',
    nodeIds: []
  },
  'layer:api-services': {
    id: 'layer:api-services',
    name: 'Services & Business Logic',
    description: 'Application services, API integrations, utility functions, and business logic',
    nodeIds: []
  },
  'layer:database-data': {
    id: 'layer:database-data',
    name: 'Database & Data Layer',
    description: 'Supabase migrations, SQL schemas, seeds, and database configurations',
    nodeIds: []
  },
  'layer:config-infra': {
    id: 'layer:config-infra',
    name: 'Configuration & Infrastructure',
    description: 'Build configs, package manifests, deployment scripts, and environmental settings',
    nodeIds: []
  },
  'layer:documentation': {
    id: 'layer:documentation',
    name: 'Documentation & Guides',
    description: 'Project READMEs, architecture guides, and reference documents',
    nodeIds: []
  }
};

for (const n of nodes) {
  const path = n.filePath || '';
  const type = n.type || '';

  if (type === 'document' || path.endsWith('.md')) {
    layerBins['layer:documentation'].nodeIds.push(n.id);
  } else if (type === 'config' || type === 'pipeline' || path.includes('package.json') || path.includes('tsconfig') || path.includes('vite.config')) {
    layerBins['layer:config-infra'].nodeIds.push(n.id);
  } else if (type === 'table' || path.startsWith('supabase/') || path.includes('migration') || path.includes('schema')) {
    layerBins['layer:database-data'].nodeIds.push(n.id);
  } else if (path.startsWith('src/components') || path.startsWith('src/pages') || path.startsWith('src/app') || path.endsWith('.tsx') || path.endsWith('.jsx')) {
    layerBins['layer:frontend'].nodeIds.push(n.id);
  } else {
    layerBins['layer:api-services'].nodeIds.push(n.id);
  }
}

const layers = Object.values(layerBins).filter(l => l.nodeIds.length > 0);
writeFileSync(join(uaDir, 'intermediate/layers.json'), JSON.stringify(layers, null, 2), 'utf-8');
console.log(`Generated ${layers.length} architectural layers.`);

// Build Guided Tour
const tour = [
  {
    order: 1,
    title: "Project Overview & Architecture",
    description: "Start by reviewing the core project documentation and architecture overview.",
    nodeIds: nodes.filter(n => n.type === 'document' || n.filePath === 'README.md').slice(0, 5).map(n => n.id)
  },
  {
    order: 2,
    title: "Database Foundation & Schema",
    description: "Explore the database migrations, core schemas, and data model tables.",
    nodeIds: nodes.filter(n => n.filePath && n.filePath.startsWith('supabase/')).slice(0, 8).map(n => n.id)
  },
  {
    order: 3,
    title: "Core Business Logic & Services",
    description: "Understand the core backend services, analytics integrators, and helper logic.",
    nodeIds: nodes.filter(n => n.filePath && (n.filePath.includes('services/') || n.filePath.includes('lib/'))).slice(0, 10).map(n => n.id)
  },
  {
    order: 4,
    title: "Frontend Application & UI Components",
    description: "Inspect the primary React components, page views, and design engine.",
    nodeIds: nodes.filter(n => n.filePath && (n.filePath.startsWith('src/components') || n.filePath.startsWith('src/pages'))).slice(0, 10).map(n => n.id)
  }
];

writeFileSync(join(uaDir, 'intermediate/tour.json'), JSON.stringify(tour, null, 2), 'utf-8');
console.log(`Generated guided tour with ${tour.length} steps.`);
