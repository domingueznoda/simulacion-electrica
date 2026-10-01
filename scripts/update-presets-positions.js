import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const presetsPath = path.resolve(__dirname, '../src/engine/presets.ts');

const newPositions = {
  // full_house_rebt
  'node-src-fh': { x: 80, y: 700 },
  'node-iga-fh': { x: 480, y: 700 },
  'node-pcs-fh': { x: 880, y: 700 },
  'node-rcd-fh': { x: 1280, y: 700 },
  'node-brk-c1': { x: 1750, y: 180 },
  'node-brk-c2': { x: 1750, y: 700 },
  'node-brk-c3': { x: 1750, y: 1050 },
  'node-brk-c4': { x: 1750, y: 1350 },
  'node-brk-c5': { x: 1750, y: 1650 },
  'node-sw-bath': { x: 2250, y: -40 },
  'node-lamp-bath': { x: 2750, y: -40 },
  'node-sw1-q1': { x: 2250, y: 140 },
  'node-cr-q1': { x: 2750, y: 140 },
  'node-sw2-q1': { x: 3250, y: 140 },
  'node-lamp-q1': { x: 3750, y: 140 },
  'node-sw1-q2': { x: 2250, y: 320 },
  'node-cr-q2': { x: 2750, y: 320 },
  'node-sw2-q2': { x: 3250, y: 320 },
  'node-lamp-q2': { x: 3750, y: 320 },
  'node-sw-living': { x: 2250, y: 500 },
  'node-lamp-living': { x: 2750, y: 500 },
  'node-sw-kitchen': { x: 3250, y: 500 },
  'node-lamp-kitchen': { x: 3750, y: 500 },
  'node-sock-living': { x: 2250, y: 700 },
  'node-sock-q1': { x: 2750, y: 700 },
  'node-sock-q2': { x: 3250, y: 700 },
  'node-sock-c3': { x: 2250, y: 1050 },
  'node-sock-c4': { x: 2250, y: 1350 },
  'node-sock-bath': { x: 2250, y: 1650 },
  'node-sock-kitchen-aux': { x: 2750, y: 1650 },

  // simple_light
  'node-source-1': { x: 100, y: 240 },
  'node-breaker-1': { x: 500, y: 240 },
  'node-switch-1': { x: 960, y: 240 },
  'node-lamp-1': { x: 1440, y: 240 },

  // two_way_switch
  'node-src-tw': { x: 100, y: 240 },
  'node-brk-tw': { x: 500, y: 240 },
  'node-sw1-tw': { x: 960, y: 240 },
  'node-sw2-tw': { x: 1480, y: 240 },
  'node-lamp-tw': { x: 2000, y: 240 },

  // intermediate_switch
  'node-src-cr': { x: 100, y: 240 },
  'node-brk-cr': { x: 500, y: 240 },
  'node-sw1-cr': { x: 960, y: 240 },
  'node-cross-1': { x: 1480, y: 240 },
  'node-sw2-cr': { x: 2000, y: 240 },
  'node-lamp-cr': { x: 2520, y: 240 },

  // short_circuit_demo
  'node-src-short': { x: 120, y: 240 },
  'node-brk-short': { x: 560, y: 240 },
  'node-switch-short': { x: 1060, y: 240 },
};

let content = fs.readFileSync(presetsPath, 'utf8');

// Regex to find each node block with its id and position
// Example:
// id: 'node-src-fh',
// type: 'sourceNode',
// position: { x: 40, y: 450 },
let replacedCount = 0;

for (const [nodeId, pos] of Object.entries(newPositions)) {
  const nodePattern = new RegExp(
    `(id:\\s*['"]${nodeId}['"],\\s*\\n\\s*type:\\s*['"][^'"]+['"],\\s*\\n\\s*position:\\s*\\{\\s*x:)[^,]+(,\\s*y:)[^}]+(\\})`,
    'g'
  );

  const matched = nodePattern.test(content);
  if (matched) {
    content = content.replace(
      nodePattern,
      `$1 ${pos.x}$2 ${pos.y}$3`
    );
    replacedCount++;
  } else {
    console.warn(`Could not match pattern for node: ${nodeId}`);
  }
}

fs.writeFileSync(presetsPath, content, 'utf8');
console.log(`Successfully updated ${replacedCount} node positions in presets.ts!`);
