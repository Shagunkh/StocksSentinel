const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();



// @route    POST api/auth/register
// @desc     Register user
// @access   Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({
        name,
        email,
        password,
        walletBalance: 4000 
      });

      await user.save();

      const token = user.getSignedJwtToken();

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          walletBalance: user.walletBalance
        }
      });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    POST api/auth/login
// @desc     Authenticate user & get token
// @access   Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const token = user.getSignedJwtToken();

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          walletBalance: user.walletBalance
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route    GET api/auth/user
// @desc     Get current user data
// @access   Private
router.get('/user', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ 
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance || 0,
        holdings: user.holdings || [],
        orders: user.orders || [],
        positions: user.positions || []
      }
    });
  } catch (err) {
    console.error('Error in /user endpoint:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('watchlist');
    res.json({ watchlist: user.watchlist || [] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
// @route    POST api/auth/trade
// @desc     Execute trade (buy/sell)
// @access   Private
// server/routes/auth.js
router.post('/trade', protect, async (req, res) => {
  const { symbol, type, quantity, price, product } = req.body;
  
  // Input validation
  if (!symbol || !type || !quantity || !price || !product) {
    return res.status(400).json({ 
      success: false,
      message: 'Missing required fields' 
    });
  }

  if (!['BUY', 'SELL'].includes(type)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid trade type' 
    });
  }

  try {
    const user = await User.findById(req.user.id);
    
    if (type === 'BUY') {
      const totalCost = quantity * price;
      if (user.walletBalance < totalCost) {
        return res.status(400).json({ 
          success: false,
          message: 'Insufficient funds' 
        });
      }
      
      // Update holdings
      const existingHolding = user.holdings.find(h => h.symbol === symbol);
      if (existingHolding) {
        existingHolding.quantity += quantity;
        existingHolding.avgPrice = 
          ((existingHolding.avgPrice * (existingHolding.quantity - quantity)) + 
          (price * quantity)) / existingHolding.quantity;
      } else {
        user.holdings.push({ 
          symbol, 
          quantity, 
          avgPrice: price, 
          product 
        });
      }
      
      // Update wallet
      user.walletBalance -= totalCost;
    } 
    
    if (type === 'SELL') {
      const existingHolding = user.holdings.find(h => h.symbol === symbol);
      if (!existingHolding || existingHolding.quantity < quantity) {
        return res.status(400).json({ 
          success: false,
          message: 'Not enough holdings to sell' 
        });
      }
      
      // Update holdings
      existingHolding.quantity -= quantity;
      if (existingHolding.quantity === 0) {
        user.holdings = user.holdings.filter(h => h.symbol !== symbol);
      }
      
      // Update wallet
      user.walletBalance += quantity * price;
    }
    
    // Add to orders
    user.orders.push({
      symbol,
      type,
      product,
      quantity,
      price,
      status: 'COMPLETED',
      timestamp: new Date()
    });
    // Add to watchlist
// @route   POST api/auth/watchlist
// @desc    Add stock to watchlist
// @access  Private
// Add to watchlist

    // Update positions
    const existingPosition = user.positions.find(p => p.symbol === symbol);
    if (existingPosition) {
      if (type === 'BUY') {
        existingPosition.quantity += quantity;
        existingPosition.avgPrice = 
          ((existingPosition.avgPrice * (existingPosition.quantity - quantity)) + 
          (price * quantity)) / existingPosition.quantity;
      } else {
        existingPosition.quantity -= quantity;
        if (existingPosition.quantity === 0) {
          user.positions = user.positions.filter(p => p.symbol !== symbol);
        }
      }
      // Update LTP and P&L
      existingPosition.ltp = price;
      existingPosition.pnl = 
        (existingPosition.ltp - existingPosition.avgPrice) * existingPosition.quantity;
      existingPosition.change = 
        ((existingPosition.ltp - existingPosition.avgPrice) / existingPosition.avgPrice) * 100;
    } else if (type === 'BUY') {
      user.positions.push({
        symbol,
        product,
        quantity,
        avgPrice: price,
        ltp: price,
        pnl: 0,
        change: 0
      });
    }
    
    await user.save();
    
    res.json({ 
      success: true,
      walletBalance: user.walletBalance,
      user: {
        holdings: user.holdings,
        orders: user.orders,
        positions: user.positions
      }
    });
  } catch (err) {
    console.error('Trade error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing trade' 
    });
  }
});

// @route    POST api/auth/funds
// @desc     Add/withdraw funds
// @access   Private
// Update the funds route with better error handling
// server/routes/auth.js
// ... (keep existing imports and other routes)
router.post('/watchlist', protect, async (req, res) => {
  const { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({
      success: false,
      message: 'Symbol is required'
    });
  }

  try {
    const user = await User.findById(req.user.id);
    
    if (user.watchlist.includes(symbol)) {
      return res.status(400).json({ 
        success: false,
        message: 'Stock already in watchlist' 
      });
    }

    user.watchlist.push(symbol);
    await user.save();

    res.status(200).json({ 
      success: true,
      watchlist: user.watchlist,
      user: {
        id: user._id,
        walletBalance: user.walletBalance
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error adding to watchlist' 
    });
  }
});
// Remove from watchlist
router.delete('/watchlist/:symbol', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Remove from watchlist
    user.watchlist = user.watchlist.filter(s => s !== req.params.symbol);
    await user.save();

    res.status(200).json({ 
      success: true,
      watchlist: user.watchlist 
    });
  } catch (err) {
    console.error('Remove from watchlist error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error removing from watchlist' 
    });
  }
});

// Get watchlist
router.get('/watchlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('watchlist');
    res.status(200).json({ 
      success: true,
      watchlist: user.watchlist || [] 
    });
  } catch (err) {
    console.error('Get watchlist error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error getting watchlist' 
    });
  }
});
router.post('/funds', protect, async (req, res) => {
  const { amount, action, bankName } = req.body;

  // Input validation
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Please provide a valid positive amount' 
    });
  }

  if (!['ADD', 'WITHDRAW'].includes(action)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid action type' 
    });
  }

  if (!bankName || bankName.trim() === '') {
    return res.status(400).json({ 
      success: false,
      message: 'Bank name is required' 
    });
  }

  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const amountValue = parseFloat(amount);
    
    if (action === 'WITHDRAW' && user.walletBalance < amountValue) {
      return res.status(400).json({ 
        success: false,
        message: 'Insufficient funds' 
      });
    }

    // Update wallet balance
    user.walletBalance = action === 'ADD' 
      ? user.walletBalance + amountValue 
      : user.walletBalance - amountValue;

    // Add transaction record
    user.transactions = user.transactions || [];
    user.transactions.push({
      type: action,
      amount: amountValue,
      bankName,
      date: new Date()
    });

    await user.save();

    res.json({ 
      success: true,
      walletBalance: user.walletBalance,
      message: `Funds ${action === 'ADD' ? 'added to' : 'withdrawn from'} wallet successfully`
    });

  } catch (err) {
    console.error('Funds error:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing funds transaction' 
    });
  }
});

module.exports = router;

