#!/usr/bin/env node
/**
 * Filters kibana-openapi.yaml to keep only dashboard and visualization endpoints,
 * plus all schema components they transitively reference.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const INPUT = path.join(__dirname, '../public/kibana-openapi.yaml');
const OUTPUT = path.join(__dirname, '../public/dashboard-openapi.yaml');

const KEEP_PATHS = [
  '/api/dashboards',
  '/api/dashboards/{id}',
  '/api/visualizations',
  '/api/visualizations/{id}',
];

console.log('Parsing YAML (this may take a moment)...');
const raw = fs.readFileSync(INPUT, 'utf8');
const spec = yaml.load(raw);

// --- Filter paths ---
const filteredPaths = {};
for (const p of KEEP_PATHS) {
  if (spec.paths?.[p]) {
    filteredPaths[p] = spec.paths[p];
  } else {
    console.warn(`  Warning: path not found: ${p}`);
  }
}
console.log(`Kept ${Object.keys(filteredPaths).length} paths.`);

// --- Collect all $ref values transitively ---
const allSchemas = spec.components?.schemas ?? {};
const usedSchemas = new Set();

function collectRefs(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(collectRefs);
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === '$ref' && typeof v === 'string') {
      const match = v.match(/^#\/components\/schemas\/(.+)$/);
      if (match) {
        const name = match[1];
        if (!usedSchemas.has(name)) {
          usedSchemas.add(name);
          // Recurse into the referenced schema
          if (allSchemas[name]) {
            collectRefs(allSchemas[name]);
          }
        }
      }
    } else {
      collectRefs(v);
    }
  }
}

collectRefs(filteredPaths);
console.log(`Found ${usedSchemas.size} referenced schemas.`);

// --- Build filtered schemas ---
const filteredSchemas = {};
for (const name of usedSchemas) {
  if (allSchemas[name]) {
    filteredSchemas[name] = allSchemas[name];
  } else {
    console.warn(`  Warning: schema referenced but not defined: ${name}`);
  }
}

// --- Collect tags used by the kept paths ---
const usedTags = new Set();
for (const pathItem of Object.values(filteredPaths)) {
  for (const operation of Object.values(pathItem)) {
    if (operation?.tags) {
      operation.tags.forEach(t => usedTags.add(t));
    }
  }
}

// --- Filter tags list ---
const filteredTags = (spec.tags ?? []).filter(t => usedTags.has(t.name));

// --- Filter x-tagGroups if present ---
let filteredTagGroups;
if (spec['x-tagGroups']) {
  filteredTagGroups = spec['x-tagGroups']
    .map(group => ({
      ...group,
      tags: group.tags.filter(t => usedTags.has(t)),
    }))
    .filter(group => group.tags.length > 0);
}

// --- Build output spec ---
const output = {
  ...spec,
  ...(filteredTags.length > 0 ? { tags: filteredTags } : {}),
  ...(filteredTagGroups ? { 'x-tagGroups': filteredTagGroups } : {}),
  paths: filteredPaths,
  components: {
    ...spec.components,
    schemas: filteredSchemas,
  },
};

console.log('Writing filtered spec...');
fs.writeFileSync(OUTPUT, yaml.dump(output, { lineWidth: -1, noRefs: true }));
console.log(`Done! Written to ${OUTPUT}`);
console.log(`  Paths: ${Object.keys(filteredPaths).length}`);
console.log(`  Schemas: ${Object.keys(filteredSchemas).length}`);
