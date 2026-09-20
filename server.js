const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 80;
const DATA_ROOT = '/data';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.excalidraw': 'application/json; charset=utf-8',
};

function resolveSafe(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function listDir(dirPath, relativeTo) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const result = { path: path.relative(relativeTo, dirPath) || '/', dirs: [], files: [] };
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.excalidraw') continue;
    const full = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        result.dirs.push(entry.name);
      } else if (entry.isFile()) {
        result.files.push({ name: entry.name, size: fs.statSync(full).size });
      }
    } catch (e) { /* skip */ }
  }
  result.dirs.sort((a, b) => a.localeCompare(b));
  result.files.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const reqPath = decodeURIComponent(url.pathname);

  // API: browse directory
  if (reqPath === '/api/browse' && req.method === 'GET') {
    let subPath = (url.searchParams.get('path') || '').replace(/\.\./g, '');
    const target = resolveSafe(DATA_ROOT, path.join(DATA_ROOT, subPath));
    if (!target) { res.writeHead(403); res.end('Forbidden'); return; }
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(listDir(target, DATA_ROOT)));
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
    return;
  }

  // API: read file
  if (reqPath === '/api/file' && req.method === 'GET') {
    let subPath = (url.searchParams.get('path') || '').replace(/\.\./g, '');
    const target = resolveSafe(DATA_ROOT, path.join(DATA_ROOT, subPath));
    if (!target) { res.writeHead(403); res.end('Forbidden'); return; }
    try {
      const data = fs.readFileSync(target, 'utf-8');
      const ext = path.extname(target);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    } catch (e) { res.writeHead(404); res.end('Not Found'); }
    return;
  }

  // API: save file
  if (reqPath === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { filePath, content } = JSON.parse(body);
        let subPath = (filePath || '').replace(/\.\./g, '');
        const target = resolveSafe(DATA_ROOT, path.join(DATA_ROOT, subPath));
        if (!target) { res.writeHead(403); res.end('Forbidden'); return; }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: rename file or directory
  if (reqPath === '/api/rename' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { oldPath, newName } = JSON.parse(body);
        let subPath = (oldPath || '').replace(/\.\./g, '');
        const oldTarget = resolveSafe(DATA_ROOT, path.join(DATA_ROOT, subPath));
        if (!oldTarget || oldTarget === DATA_ROOT) {
          res.writeHead(403); res.end('Forbidden'); return;
        }
        const safeName = path.basename((newName || '').replace(/\.\./g, '').replace(/[\\/]/g, ''));
        if (!safeName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid name' }));
          return;
        }
        const newTarget = resolveSafe(DATA_ROOT, path.join(path.dirname(oldTarget), safeName));
        if (!newTarget) { res.writeHead(403); res.end('Forbidden'); return; }
        if (!fs.existsSync(oldTarget)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        if (fs.existsSync(newTarget)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Target already exists' }));
          return;
        }
        fs.renameSync(oldTarget, newTarget);
        const relNew = path.relative(DATA_ROOT, newTarget).split(path.sep).join('/');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, newPath: '/' + relNew }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: delete file or directory
  if (reqPath === '/api/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { itemPath } = JSON.parse(body);
        let subPath = (itemPath || '').replace(/\.\./g, '');
        const target = resolveSafe(DATA_ROOT, path.join(DATA_ROOT, subPath));
        if (!target || target === DATA_ROOT) {
          res.writeHead(403); res.end('Forbidden'); return;
        }
        if (!fs.existsSync(target)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        const stat = fs.statSync(target);
        if (stat.isDirectory()) {
          fs.rmSync(target, { recursive: true, force: true });
        } else {
          fs.unlinkSync(target);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: create directory
  if (reqPath === '/api/mkdir' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { dirPath } = JSON.parse(body);
        let subPath = (dirPath || '').replace(/\.\./g, '');
        const target = resolveSafe(DATA_ROOT, path.join(DATA_ROOT, subPath));
        if (!target) { res.writeHead(403); res.end('Forbidden'); return; }
        fs.mkdirSync(target, { recursive: true });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // SPA fallback: always serve index.html for non-API routes
  let filePath = reqPath === '/' ? '/index.html' : reqPath;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';
  const noCache = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (reqPath.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'text/plain', ...noCache });
        res.end('Not Found');
        return;
      }
      fs.readFile(path.join(__dirname, 'index.html'), (err2, html) => {
        if (err2) { res.writeHead(404, noCache); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...noCache });
        res.end(html);
      });
      return;
    }
    const headers = { 'Content-Type': contentType };
    if (ext === '.html' || ext === '.js') Object.assign(headers, noCache);
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Excalidraw running on port ${PORT}, data root: ${DATA_ROOT}`);
});
