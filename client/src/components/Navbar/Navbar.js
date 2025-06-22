import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './Navbar.css';

const FINNHUB_API_KEY = 'd1bh9shr01qsbpud1va0d1bh9shr01qsbpud1vag'; // Replace with your API key

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popular stock symbols to track
  const stockSymbols = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return '';
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

  // Fetch stock data from Finnhub
  const fetchStockData = async () => {
    try {
      setLoading(true);
      const promises = stockSymbols.map(symbol => 
        axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
      );
      
      const responses = await Promise.all(promises);
      const stockData = responses.map((res, index) => {
        const data = res.data;
        // Calculate the exact percentage change
        const changePercent = ((data.c - data.pc) / data.pc) * 100;
        return {
          symbol: stockSymbols[index],
          price: data.c,
          change: changePercent.toFixed(2), // Show exact percentage with sign
          up: changePercent >= 0
        };
      });
      
      setStocks(stockData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to load market data');
      setLoading(false);
    }
  };

  // Set up interval for real-time updates
  useEffect(() => {
    fetchStockData(); // Initial fetch
    
    const interval = setInterval(() => {
      fetchStockData();
    }, 30000); // Update every 30 seconds (free tier limit)
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="navbar-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/">Stock Sentinel</Link>
        </div>
        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/holdings">Positions</Link>
              <Link to="/orders">Orders</Link>
              <Link to="/positions">Holdings</Link>
              <Link to="/funds">Funds</Link>
              <Link to="/app">App</Link>
              
              <div className="profile-container">
                <Link to="/profile" className="profile-circle">
                  {getInitials(user?.name)}
                </Link>
                <span className="welcome-message">Welcome, {user?.name}</span>
              </div>
              
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
      
      {/* Stock Ticker with real-time data */}
      <div className="stock-ticker-container">
        {loading ? (
          <div className="ticker-loading">Loading market data...</div>
        ) : error ? (
          <div className="ticker-error">{error}</div>
        ) : (
          <div className="stock-ticker">
            {stocks.map((stock, index) => (
              <span 
                key={index} 
                className={`stock-item ${stock.up ? 'up' : 'down'}`}
              >
                {stock.symbol} {stock.change}%
                {stock.up ? (
                  <i className="fas fa-arrow-up"></i>
                ) : (
                  <i className="fas fa-arrow-down"></i>
                )}
              </span>
            ))}
            {/* Duplicate for seamless looping */}
            {stocks.map((stock, index) => (
              <span 
                key={`dup-${index}`} 
                className={`stock-item ${stock.up ? 'up' : 'down'}`}
              >
                {stock.symbol} {stock.change}%
                {stock.up ? (
                  <i className="fas fa-arrow-up"></i>
                ) : (
                  <i className="fas fa-arrow-down"></i>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;