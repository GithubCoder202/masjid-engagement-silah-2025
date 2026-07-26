const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
// Render assigns a dynamic port via process.env.PORT
const port = process.env.PORT || 3000;

// 1. Middleware to parse JSON request bodies from your HTML fetch calls
app.use(express.json());

// 2. Serve static files from the current folder (index.html, styles, client JS)
app.use(express.static(__dirname));

// 3. Initialize the Gemini SDK using your Render environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 4. Create the API endpoint your frontend HTML will send prompts to
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Request text generation from Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // Send the generated text back to your frontend
    res.json({ text: response.text });
  } catch (error) {
    console.error('Error connecting to Gemini API:', error);
    res.status(500).json({ error: 'Failed to process request with Gemini' });
  }
});

// 5. Start listening on the designated port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
