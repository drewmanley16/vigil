import { createServer } from 'http';
import { getStats } from './stats.js';

export function startHttpServer(port: number = 3001): void {
  const server = createServer((req, res) => {
    // CORS for dashboard polling
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url?.split('?')[0];

    if (url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
    } else if (url === '/stats') {
      res.writeHead(200);
      res.end(JSON.stringify(getStats()));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] HTTP server listening on port ${port} — /health /stats`);
  });
}
