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

// ------------------------------------------------------------------
// Coordinate enrichment: the upstream API doesn't return lat/lon for
// every mosque. Some records have coordinates baked into their `url`
// field (a Google Maps search link like ".../search/?api=1&query=39.15,-77.14"),
// but others just link to the mosque's real website, with no
// coordinates anywhere. For those, we geocode the `address` field
// using Photon (komoot's free OSM-based geocoder, https://photon.komoot.io).
//
// Note: we originally tried Nominatim directly, but its servers
// actively block generic/placeholder User-Agent strings (a common
// anti-bot measure), which made every request fail with a 403.
// Photon's public demo endpoint doesn't require that dance and is a
// good fit for this kind of low-volume personal-project use.
// ------------------------------------------------------------------
const GEOCODE_URL = 'https://photon.komoot.io/api/';

// Cache geocoded addresses in memory so repeat requests (and repeat
// mosques across different lat/lon queries) don't re-hit the geocoder.
const geocodeCache = new Map();
let lastGeocodeCallAt = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function coordsFromUrl(url) {
    if (!url) return null;
    const match = url.match(/query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (!match) return null;
    return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
}

// Photon can also stumble on suite/unit-level detail (e.g. "Suite 100-A19"),
// so we strip that out for a simplified fallback query if the first
// attempt comes back empty.
function simplifyAddress(address) {
    return address
        .replace(/,?\s*(suite|ste|unit|apt|#)\s*[\w-]+/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

async function queryGeocoder(query) {
    const url = `${GEOCODE_URL}?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
        console.error(`[geocode] request failed (${res.status}) for query: "${query}"`);
        return null;
    }
    const data = await res.json();
    const feature = data && Array.isArray(data.features) ? data.features[0] : null;
    console.log(`[geocode] query: "${query}" -> ${feature ? 1 : 0} result(s)`);
    if (feature && Array.isArray(feature.geometry?.coordinates)) {
        const [lon, lat] = feature.geometry.coordinates;
        return { lat, lon };
    }
    return null;
}

async function geocodeAddress(address) {
    if (!address) return null;
    if (geocodeCache.has(address)) return geocodeCache.get(address);

    // Be a good citizen on the shared public endpoint: space calls out
    const waitMs = 1000 - (Date.now() - lastGeocodeCallAt);
    if (waitMs > 0) await sleep(waitMs);
    lastGeocodeCallAt = Date.now();

    try {
        let coords = await queryGeocoder(address);

        if (!coords) {
            const simplified = simplifyAddress(address);
            if (simplified !== address) {
                await sleep(1000);
                lastGeocodeCallAt = Date.now();
                coords = await queryGeocoder(simplified);
            }
        }

        geocodeCache.set(address, coords);
        return coords;
    } catch (err) {
        console.error('Geocode error for address:', address, err);
        geocodeCache.set(address, null);
        return null;
    }
}

async function enrichWithCoords(mosques) {
    const enriched = [];
    for (const m of mosques) {
        let coords = coordsFromUrl(m.url);
        if (!coords) {
            coords = await geocodeAddress(m.address);
        }
        enriched.push({
            ...m,
            lat: coords ? coords.lat : null,
            lon: coords ? coords.lon : null
        });
    }
    return enriched;
}

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

        if (!upstreamRes.ok) {
            res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json' });
            res.end(body);
            return;
        }

        let mosques;
        try {
            mosques = JSON.parse(body);
        } catch (parseErr) {
            // Not JSON (or not an array) — just pass it through as-is
            res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json' });
            res.end(body);
            return;
        }

        const enriched = Array.isArray(mosques) ? await enrichWithCoords(mosques) : mosques;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(enriched));
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