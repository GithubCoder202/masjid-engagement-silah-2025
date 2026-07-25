// server.js
// Silah AI Backend – Uses Google Gemini API

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini with your API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/chat
 * Accepts messages and a model type, returns Gemini's response.
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model } = req.body;

        // Build system prompt based on selected model
        let systemPrompt = 'You are a helpful Islamic learning assistant.';
        if (model === 'Quranic Arabic Tutor') {
            systemPrompt = 'You are an expert tutor in Quranic Arabic. Help users understand grammar, vocabulary, and tafsir.';
        } else if (model === 'Hadith Expert') {
            systemPrompt = 'You are a scholar specialising in Hadith. Provide context, authenticity, and explanations.';
        } else if (model === 'Islamic History Guide') {
            systemPrompt = 'You are a guide to Islamic history. Offer detailed historical context and timelines.';
        }

        // Use the Gemini 1.5 Flash model (fast and capable)
        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Convert message history to Gemini's format
        const history = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Start a chat with system instruction embedded in history
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

        // Get the last user message and send it
        const lastUserMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastUserMessage.content);
        const responseText = result.response.text();

        res.json({ response: responseText });
    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Silah AI backend running on port ${PORT}`);
});
