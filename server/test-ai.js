const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env

const OPENROUTER_API_KEY = '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';// Get key from .env
const symbol = 'MSFT'; // Your test symbol

if (!OPENROUTER_API_KEY) {
    console.error("Error: OPENROUTER_API_KEY is not set. Please create a .env file or set the environment variable.");
    process.exit(1);
}

const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

async function getStockInfo(stockSymbol) {
    try {
        const response = await axios.post(apiUrl, {
            // *** CHANGE THIS LINE ***
            // Replace with a valid model ID from OpenRouter's list, e.g.:
            model: "openai/gpt-3.5-turbo", // Or "mistralai/mixtral-8x7b-instruct-v0.1", etc.
            messages: [
                { "role": "system", "content": "You are a financial assistant." },
                { "role": "user", "content": `Tell me something interesting about ${stockSymbol}.` }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Response from OpenRouter:", response.data.choices[0].message.content);
    } catch (error) {
        console.error("Error calling OpenRouter API:", error.response ? error.response.data : error.message);
    }
}

getStockInfo(symbol);