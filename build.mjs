import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
await mkdir(path.join(root, 'dist'), { recursive: true });
for (const name of ['index.html', 'styles.css', 'mobile.css', 'app.js', 'engine.js', 'renderer.js', 'camera.js', 'touch-controls.js', 'icon.svg']) await copyFile(path.join(root, name), path.join(root, 'dist', name));
await writeFile(path.join(root, 'dist', '.nojekyll'), '');
console.log('静态网页已生成到 dist/，无需外部依赖。');
