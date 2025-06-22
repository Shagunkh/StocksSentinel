const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Define sub-schemas first
const HoldingSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  avgPrice: { type: Number, required: true, min: 0 },
  product: {
    type: String,
    enum: ['CNC', 'MIS', 'NRML'],
    default: 'CNC'
  }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  product: {
    type: String,
    enum: ['CNC', 'MIS', 'NRML'],
    default: 'CNC'
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['COMPLETED', 'PENDING', 'CANCELLED'],
    default: 'COMPLETED'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ADD', 'WITHDRAW'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const PositionSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  product: {
    type: String,
    enum: ['CNC', 'MIS', 'NRML'],
    default: 'CNC'
  },
  quantity: { type: Number, required: true, min: 0 },
  avgPrice: { type: Number, required: true, min: 0 },
  ltp: { type: Number, required: true, min: 0 },
  pnl: { type: Number, default: 0 },
  change: { type: Number, default: 0 }
}, { _id: false });


const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  walletBalance: {
    type: Number,
    default: 4000,
    min: 0
  },
  watchlist: {
    type: [String],
    default: []
  },
  transactions: [TransactionSchema],
  holdings: [HoldingSchema],
  orders: [OrderSchema],
  positions: [PositionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
// Ensure your token generation method looks like this:
UserSchema.methods.getSignedJwtToken = function() {
  // Ensure payload is simple and contains an ID
  const payload = { 
    id: this._id,
    // Add any other minimal claims needed
  };

  // Verify JWT_SECRET is loaded
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  // Generate token with explicit algorithm
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
    algorithm: 'HS256' // Explicitly specify algorithm
  });

  console.log('Generated token:', {
    token: token,
    length: token.length,
    parts: token.split('.').length
  });

  return token;
};
// Sign JWT and return
// In models/User.js
UserSchema.methods.passwordChangedAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};
// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);