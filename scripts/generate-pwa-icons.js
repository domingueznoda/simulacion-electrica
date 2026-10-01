import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

const iconSvgPath = path.join(publicDir, 'icon.svg');
const baseSvg = fs.readFileSync(iconSvgPath, 'utf8');

// SVG para Maskable Icon: fondo completo sangrado (#0f172a sin rx) y elementos escalados al 80% (zona segura de Android)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#0f172a" />
  <g transform="translate(256, 256) scale(0.82) translate(-256, -256)">
    <circle cx="256" cy="256" r="180" stroke="#3b82f6" stroke-width="16" stroke-dasharray="12 12" opacity="0.6" />
    <path d="M280 64L160 272H272L232 448L372 240H260L280 64Z" fill="#eab308" stroke="#fef08a" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="160" cy="272" r="12" fill="#ef4444" />
    <circle cx="372" cy="240" r="12" fill="#3b82f6" />
  </g>
</svg>`;

const targets = [
  { file: 'pwa-512x512.png', size: 512, svg: baseSvg },
  { file: 'pwa-192x192.png', size: 192, svg: baseSvg },
  { file: 'apple-touch-icon.png', size: 180, svg: baseSvg },
  { file: 'pwa-maskable-512x512.png', size: 512, svg: maskableSvg },
];

for (const target of targets) {
  const resvg = new Resvg(target.svg, {
    fitTo: { mode: 'width', value: target.size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const outPath = path.join(publicDir, target.file);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${target.file} (${target.size}x${target.size}) - ${pngBuffer.length} bytes`);
}

console.log('All PWA icons successfully generated from icon.svg!');
