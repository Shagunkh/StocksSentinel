// server/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const authRoutes = require('./routes/auth');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const MONGODB_URI="mongodb+srv://shagun:%40Shagun.k123@cluster0.aqluht1.mongodb.net/stocks?retryWrites=true&w=majority&appName=Cluster0";
// Database connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.get('/api/yahoo-finance/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range, interval } = req.query;
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    const response = await axios.get(url);
    
    res.json(response.data);
  } catch (error) {
    console.error('Yahoo Finance proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch data from Yahoo Finance' });
  }
});

// ... other middleware and routes


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));