import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const base = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv.includes('--public') ? path.join(base, 'dist') : base;
const port = Number(process.env.PORT || 4193);
const url = `http://127.0.0.1:${port}`;
const open = () => spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, stdio: 'ignore' }).on('error', () => console.log(`请打开 ${url}`));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const allowed = new Set(['index.html', 'styles.css', 'app.js', 'engine.js', 'renderer.js', 'icon.svg']);
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, url).pathname);
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!allowed.has(file)) { res.writeHead(404).end('Not found'); return; }
    const target = path.join(root, file); const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else createReadStream(target).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE' && process.argv.includes('--open')) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if ((await response.text()).includes('<title>热锅搭档 · Little Kitchen</title>')) { console.log(`厨房已开张：${url}`); open(); return; }
    } catch {}
  }
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请修改 PORT 后重试。` : error); process.exit(1);
});
server.listen(port, '127.0.0.1', () => { console.log(`热锅搭档 · Little Kitchen\n${url}\n按 Ctrl+C 关闭厨房。`); if (process.argv.includes('--open')) open(); });
