// server.js – Gemini Chat + Mosque Proxy + Test Route
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

// ============================================================
// TEST ROUTE – to verify server is responding
// ============================================================
app.get('/ping', (req, res) => {
    res.json({ message: 'pong', routes: ['/ping', '/api/chat', '/api/mosques'] });
});

// ============================================================
// GEMINI AI CHAT
// ============================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model } = req.body;

        let systemPrompt = 'You are a helpful Islamic learning assistant.';
        if (model === 'Quranic Arabic Tutor') {
            systemPrompt = 'You are an expert tutor in Quranic Arabic. Help users understand grammar, vocabulary, and tafsir.';
        } else if (model === 'Hadith Expert') {
            systemPrompt = 'You are a scholar specialising in Hadith. Provide context, authenticity, and explanations.';
        } else if (model === 'Islamic History Guide') {
            systemPrompt = 'You are a guide to Islamic history. Offer detailed historical context and timelines.';
        }

        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
                maxOutputTokens: 800,
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
// MOSQUE PROXY (optional)
// ============================================================
app.get('/api/mosques', async (req, res) => {
    try {
        const { lat, lon, radius = 30, limit = 5 } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Missing lat or lon parameters' });
        }

        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const apiUrl = `https://time.now/mosques/api/mosques?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`;
        const url = proxyUrl + encodeURIComponent(apiUrl);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Mosque API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Silah backend running on port ${PORT}`);
    console.log(`   📌 GET  /ping          (test)`);
    console.log(`   📌 POST /api/chat      (Gemini AI)`);
    console.log(`   📌 GET  /api/mosques   (Mosque finder)`);
});
