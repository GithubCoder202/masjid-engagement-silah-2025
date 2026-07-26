// server.js – Merged Gemini AI + Mosque Proxy
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from root directory
app.use(express.static(__dirname));

// Serve index2.html at root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html'));
});

// ============================================================
// UPTIME ROBOT HEALTH CHECK ENDPOINT
// ============================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// ============================================================
// GEMINI CHAT ENDPOINT
// ============================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY is not set — /api/chat will fail until you add it to your .env file.');
} else {
    console.log(`✅ GEMINI_API_KEY loaded (starts with "${process.env.GEMINI_API_KEY.slice(0, 4)}...", length ${process.env.GEMINI_API_KEY.length})`);
}

app.post('/api/chat', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
        }

        const { messages, model } = req.body;

        // System prompt based on selected model
        let systemPrompt = 'You are a helpful Islamic learning assistant.';
        if (model === 'Quranic Arabic Tutor') {
            systemPrompt = 'You are an expert tutor in Quranic Arabic. Help users understand grammar, vocabulary, and tafsir.';
        } else if (model === 'Hadith Expert') {
            systemPrompt = 'You are a scholar specialising in Hadith. Provide context, authenticity, and explanations.';
        } else if (model === 'Islamic History Guide') {
            systemPrompt = 'You are a guide to Islamic history. Offer detailed historical context and timelines.';
        }

        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        // Convert message history to Gemini format
        const history = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = geminiModel.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'Understood. I will follow that guidance.' }] },
                ...history
            ],
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
            },
        });

        const lastUserMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastUserMessage.content);
        const responseText = result.response.text();

        res.json({ response: responseText });
    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CONTENT MODERATION (OpenAI Moderation API)
// ============================================================
// Keeps the OpenAI API key server-side only — never send it to the client.
app.post('/api/moderate', async (req, res) => {
    try {
        const { content } = req.body;

        if (typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({ error: 'Missing "content" string in request body' });
        }

        if (!process.env.OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY is not set in the server environment');
            return res.status(500).json({ error: 'Moderation is not configured on the server' });
        }

        const moderationRes = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'omni-moderation-latest',
                input: content
            })
        });

        if (!moderationRes.ok) {
            const errBody = await moderationRes.text();
            console.error('OpenAI moderation error:', moderationRes.status, errBody);
            return res.status(502).json({ error: 'Moderation provider error' });
        }

        const data = await moderationRes.json();
        const result = data.results && data.results[0];

        if (!result) {
            return res.status(502).json({ error: 'Unexpected moderation response' });
        }

        if (result.flagged) {
            const flaggedCategories = Object.keys(result.categories)
                .filter(key => result.categories[key] === true);
            return res.json({
                approved: false,
                reason: `Content flagged for: ${flaggedCategories.join(', ')}`
            });
        }

        return res.json({ approved: true, reason: 'Content approved' });
    } catch (error) {
        console.error('Moderation route error:', error);
        res.status(500).json({ error: 'Failed to run moderation', details: String(error) });
    }
});

// ============================================================
// MOSQUE FINDER PROXY (with geocoding enrichment)
// ============================================================
const UPSTREAM = 'https://time.now/mosques/api/mosques';
const GEOCODE_URL = 'https://photon.komoot.io/api/';
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

    // Rate limit – be a good citizen on the public Photon endpoint
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

app.get('/api/mosques', async (req, res) => {
    try {
        // req.url is a plain string here, not a URL object — build the
        // upstream query string from req.query (parsed by Express) instead
        // of reaching for req.url.search, which resolves to the built-in
        // String.prototype.search method rather than a query string.
        const qs = new URLSearchParams(req.query).toString();
        const upstreamUrl = `${UPSTREAM}${qs ? `?${qs}` : ''}`;
        const upstreamRes = await fetch(upstreamUrl);
        const body = await upstreamRes.text();

        if (!upstreamRes.ok) {
            return res.status(upstreamRes.status).type('application/json').send(body);
        }

        let mosques;
        try {
            mosques = JSON.parse(body);
        } catch (parseErr) {
            // Not JSON – pass through as-is
            return res.status(upstreamRes.status).type('application/json').send(body);
        }

        const enriched = Array.isArray(mosques) ? await enrichWithCoords(mosques) : mosques;
        res.json(enriched);
    } catch (err) {
        console.error('Mosque proxy error:', err);
        res.status(502).json({ error: 'Failed to reach mosque API', details: String(err) });
    }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Merged server running on http://localhost:${PORT}`);
    console.log(`   📌 Web App:    http://localhost:${PORT}`);
    console.log(`   📌 GET  /api/health   (Uptime Robot)`);
    console.log(`   📌 POST /api/chat     (Gemini AI)`);
    console.log(`   📌 POST /api/moderate (OpenAI Moderation)`);
    console.log(`   📌 GET  /api/mosques  (Mosque proxy)`);
});
