require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
