// Dev-only CORS-Proxy für Expo Web.
// Leitet http://localhost:8082/* → https://keramik-auszeit.de/* und ergänzt CORS-Header.
import http from 'http';
import https from 'https';

const TARGET_HOST = 'keramik-auszeit.de';
const PORT = Number(process.env.PROXY_PORT || 8082);

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.setHeader('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const upstream = https.request(
    {
      hostname: TARGET_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: TARGET_HOST },
    },
    (upstreamRes) => {
      const headers = { ...upstreamRes.headers };
      delete headers['access-control-allow-origin'];
      res.writeHead(upstreamRes.statusCode || 502, {
        ...headers,
        'access-control-allow-origin': '*',
      });
      upstreamRes.pipe(res);
    },
  );

  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(upstream);
});

server.listen(PORT, () => {
  console.log(`[dev-proxy] http://localhost:${PORT} → https://${TARGET_HOST}`);
});
