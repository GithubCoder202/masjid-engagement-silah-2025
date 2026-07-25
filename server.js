// server.js — tiny local proxy for the mosque finder API
//
// Why this exists: the browser blocks direct calls from your page to
// https://time.now/... because that API doesn't send CORS headers.
// This server calls the API for you (server-to-server calls aren't
// subject to CORS) and re-sends the JSON to your page with a
// permissive CORS header attached.
//
// Run it with:  node server.js
// It listens on http://localhost:3001

const http = require('http');

const PORT = 3001;
const UPSTREAM = 'https://time.now/mosques/api/mosques';

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Always allow the page to call this server from any origin (incl. file://)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (url.pathname !== '/api/mosques') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    try {
        const upstreamUrl = `${UPSTREAM}${url.search}`;
        const upstreamRes = await fetch(upstreamUrl);
        const body = await upstreamRes.text();

        res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json' });
        res.end(body);
    } catch (err) {
        console.error('Proxy error:', err);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to reach mosque API', details: String(err) }));
    }
});

server.listen(PORT, () => {
    console.log(`Mosque API proxy running at http://localhost:${PORT}`);
    console.log(`Try it: http://localhost:${PORT}/api/mosques?lat=39.174674&lon=-77.149983&radius=30&limit=5`);
});