import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Watchlist.css';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import '@fortawesome/fontawesome-free/css/all.min.css';

// ChartModal component
const ChartModal = ({ symbol, onClose }) => {
  const chartContainerRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('1D');
  const [interval, setInterval] = useState('5m');

  const cleanupChart = useCallback(() => {
    if (chartInstance.current) {
      try {
        chartInstance.current.remove();
        chartInstance.current = null;
      } catch (e) {
        console.warn("Error during chart cleanup:", e);
      }
    }
    if (chartContainerRef.current) {
      chartContainerRef.current.innerHTML = '';
    }
  }, []);

  const fetchYahooFinanceData = useCallback(async (symbol, timeframe) => {
    try {
      setLoading(true);
      setError(null);
      
      let range, interval;
      switch(timeframe) {
        case '1D': range = '1d'; interval = '5m'; break;
        case '1W': range = '5d'; interval = '15m'; break;
        case '1M': range = '1mo'; interval = '1d'; break;
        case '3M': range = '3mo'; interval = '1d'; break;
        case '1Y': range = '1y'; interval = '1wk'; break;
        case '5Y': range = '5y'; interval = '1mo'; break;
        default: range = '1d'; interval = '5m';
      }

      const response = await axios.get(`/api/yahoo-finance/${symbol}`, {
        params: { range, interval }
      });

      if (!response.data?.chart?.result) {
        throw new Error('Invalid response from Yahoo Finance API');
      }

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      const chartData = timestamps.map((time, index) => ({
        time: time,
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index] || 0
      })).filter(item => item.open && item.high && item.low && item.close);

      if (chartData.length === 0) {
        throw new Error('No valid data points received');
      }

      return chartData;
    } catch (err) {
      console.error("Error fetching from Yahoo Finance:", err);
      throw err;
    }
  }, []);

  const renderChart = useCallback((data) => {
    cleanupChart();
    if (!chartContainerRef.current || data.length === 0) return;
    
    const container = chartContainerRef.current;
    container.innerHTML = '';
    
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: { backgroundColor: '#ffffff', textColor: '#333' },
      grid: {
        vertLines: { color: '#eee' },
        horzLines: { color: '#eee' },
      },
      crosshair: { mode: 'normal' },
      timeScale: { borderColor: '#ccc' },
    });
    
    chartInstance.current = chart;
    
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    
    candleSeries.setData(data);
    
    if (data[0].volume !== undefined) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      
      volumeSeries.setData(data.map(item => ({
        time: item.time,
        value: item.volume,
        color: item.close > item.open ? '#26a69a' : '#ef5350'
      })));
    }
    
    chart.timeScale().fitContent();
    
    const handleResize = () => {
      if (chartInstance.current && chartContainerRef.current) {
        chartInstance.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cleanupChart]);

  useEffect(() => {
    if (!symbol) return;

    const loadData = async () => {
      try {
        const chartData = await fetchYahooFinanceData(symbol, timeframe);
        renderChart(chartData);
      } catch (err) {
        console.error("Failed to load chart data:", err);
        setError('Failed to load chart data. Please try again later.');
        cleanupChart();
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      cleanupChart();
    };
  }, [symbol, timeframe, fetchYahooFinanceData, renderChart, cleanupChart]);

  return (
    <div className="chart-modal">
      <div className="chart-modal-content">
        <div className="chart-modal-header">
          <h3>{symbol} Price Chart</h3>
          <div className="timeframe-selector">
            {['1D', '1W', '1M', '3M', '1Y', '5Y'].map((tf) => (
              <button
                key={tf}
                className={timeframe === tf ? 'active' : ''}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <div className="chart-modal-body">
          {loading ? (
            <div className="chart-loading">Loading chart data...</div>
          ) : error ? (
            <div className="chart-error">{error}</div>
          ) : (
            <div 
              ref={chartContainerRef} 
              className="chart-container"
              style={{ width: '100%', height: '400px' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// SummaryModal component
const SummaryModal = ({ symbol, onClose }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStockSummary = async () => {
      try {
        const OPENROUTER_API_KEY = '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';
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: "openai/gpt-3.5-turbo",
            messages: [
              { 
                "role": "system", 
                "content": "You are a financial analyst providing concise stock summaries. Provide key information including company overview, recent performance, and analyst sentiment. Keep it under 200 words." 
              },
              { 
                "role": "user", 
                "content": `Provide a summary analysis of ${symbol} stock. Include key metrics, recent performance, and outlook.` 
              }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        setSummary(response.data.choices[0].message.content);
        setLoading(false);
      } catch (err) {
        console.error("Error generating summary:", err);
        setError('Failed to generate summary. Please try again.');
        setLoading(false);
      }
    };

    fetchStockSummary();
  }, [symbol]);

  return (
    <div className="summary-modal">
      <div className="summary-modal-content">
        <div className="summary-modal-header">
          <h3>{symbol} Stock Summary</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <div className="summary-modal-body">
          {loading ? (
            <div className="summary-loading">Generating summary...</div>
          ) : error ? (
            <div className="summary-error">{error}</div>
          ) : (
            <div className="summary-text">
              {summary.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// BuySellModal component
const BuySellModal = ({ type, symbol, price, onClose, onSubmit, walletBalance }) => {
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState('CNC');
  const [total, setTotal] = useState(price);

  useEffect(() => {
    setTotal((quantity * price).toFixed(2));
  }, [quantity, price]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ symbol, quantity: parseInt(quantity), price, product, type });
  };

  return (
    <div className="trade-modal">
      <div className="trade-modal-content">
        <div className="trade-modal-header">
          <h3>{type} {symbol}</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Price:</label>
            <input type="text" value={price} readOnly />
          </div>
          <div className="form-group">
            <label>Quantity:</label>
            <input 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Product:</label>
            <select value={product} onChange={(e) => setProduct(e.target.value)}>
              <option value="CNC">CNC</option>
              <option value="MIS">MIS</option>
              <option value="NRML">NRML</option>
            </select>
          </div>
          <div className="form-group">
            <label>Total:</label>
            <input type="text" value={total} readOnly />
          </div>
          {type === 'BUY' && (
            <div className="wallet-info">
              <p>Wallet Balance: ₹{walletBalance.toFixed(2)}</p>
              {total > walletBalance && (
                <p className="error">Insufficient funds</p>
              )}
            </div>
          )}
          <button 
            type="submit" 
            className={`trade-button ${type.toLowerCase()}`}
            disabled={type === 'BUY' && total > walletBalance}
          >
            {type}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main Watchlist component
const Watchlist = ({ onWatchlistUpdate }) => {
  const FINNHUB_API_KEY = 'd1aopp9r01qjhvtqeebgd1aopp9r01qjhvtqeec0'; 
  const { user, isAuthenticated, updateWalletBalance } = useAuth();
  const navigate = useNavigate();

  // State management
  const [marketIndices, setMarketIndices] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [userWatchlist, setUserWatchlist] = useState(user?.watchlist || []);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [hoveredStock, setHoveredStock] = useState(null);
  const [tradeModal, setTradeModal] = useState(null);
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [notification, setNotification] = useState(null);
  const [summaryModal, setSummaryModal] = useState(null);
  const [chartModalSymbol, setChartModalSymbol] = useState(null);

  // Refs
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const isMountedRef = useRef(false);

  // Fetch user's watchlist when component mounts or user changes
  // Add this useEffect near your other useEffect hooks
useEffect(() => {
  const fetchWatchlist = async () => {
    if (!isAuthenticated) return;
    
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;
      
      const parsedUser = JSON.parse(userData);
      const token = parsedUser?.token;
      
      if (!token) return;
      
      const response = await axios.get(
        'http://localhost:5000/api/auth/watchlist',
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data.success) {
        setUserWatchlist(response.data.watchlist || []);
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  fetchWatchlist();
}, [isAuthenticated, navigate]);

  // Search stocks when search term changes
  useEffect(() => {
    const searchStocks = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await axios.get(
          `https://finnhub.io/api/v1/search?q=${searchTerm}&token=${FINNHUB_API_KEY}`
        );
        
        const stocks = response.data.result.filter(
          item => item.type === 'Common Stock' && item.symbol
        );
        
        setSearchResults(stocks.slice(0, 10));
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search stocks. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchStocks();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

 const addToWatchlist = async (symbol) => {
  try {
    // Get the token from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('User not authenticated');
    }
    
    const parsedUser = JSON.parse(userData);
    const token = parsedUser?.token;
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.post(
      'http://localhost:5000/api/auth/watchlist',
      { symbol },
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    if (response.data.success) {
      setUserWatchlist(response.data.watchlist);
      setNotification({
        type: 'success',
        message: `${symbol} added to watchlist successfully!`
      });
      // Update the user context if needed
      if (response.data.user) {
        updateWalletBalance(response.data.user.walletBalance);
      }
    }
  } catch (err) {
    console.error('Add to watchlist error:', err);
    setNotification({
      type: 'error',
      message: err.response?.data?.message || 
             err.message || 
             'Failed to add to watchlist'
    });
    // If unauthorized, redirect to login
    if (err.response?.status === 401) {
      navigate('/login');
    }
  } finally {
    setTimeout(() => setNotification(null), 3000);
  }
};
// Remove stock from watchlist
const removeFromWatchlist = async (symbol) => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) throw new Error('User not authenticated');
    
    const parsedUser = JSON.parse(userData);
    const token = parsedUser?.token;
    
    if (!token) throw new Error('No authentication token found');
    
    const response = await axios.delete(
      `http://localhost:5000/api/auth/watchlist/${symbol}`,
      { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    if (response.data.success) {
      setUserWatchlist(response.data.watchlist);
      setNotification({
        type: 'success',
        message: `${symbol} removed from watchlist successfully!`
      });
      // Update local storage with new user data if returned
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify({
          token,
          user: response.data.user
        }));
      }
    }
  } catch (err) {
    console.error('Remove from watchlist error:', err);
    setNotification({
      type: 'error',
      message: err.response?.data?.message || 'Failed to remove from watchlist'
    });
    if (err.response?.status === 401) {
      navigate('/login');
    }
  } finally {
    setTimeout(() => setNotification(null), 3000);
  }
};
  // Filter stocks based on search term
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredStocks(stocks);
    } else {
      const filtered = stocks.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStocks(filtered);
    }
  }, [searchTerm, stocks]);

  // WebSocket setup and management
  const setupWebSocket = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    setSocketStatus('connecting');
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);
    socketRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      console.log('WebSocket connected');
      setSocketStatus('connected');
      setError(null);
      
      try {
        stocks.forEach(stock => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'subscribe', symbol: `BSE:${stock.symbol}` }));
          }
        });
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: 'NSE:NIFTY_50' }));
          ws.send(JSON.stringify({ type: 'subscribe', symbol: 'BSE:SENSEX' }));
        }
      } catch (err) {
        console.error('Error sending subscriptions:', err);
        setError('Failed to subscribe to updates. Please refresh the page.');
      }
    };

    ws.onmessage = (e) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'trade') {
          const symbolParts = data.symbol.split(':');
          const exchange = symbolParts[0];
          const symbol = symbolParts[1];
          const price = data.p;

          if (exchange === 'BSE') {
            setStocks(prevStocks => 
              prevStocks.map(stock => 
                stock.symbol === symbol 
                  ? { 
                      ...stock, 
                      price: price,
                      change: price - (stock.price - stock.change),
                      changePercent: ((price - (stock.price - stock.change)) / (stock.price - stock.change)) * 100
                    } 
                  : stock
              )
            );
          }

          if (data.symbol === 'NSE:NIFTY_50' || data.symbol === 'BSE:SENSEX') {
            setMarketIndices(prevIndices => 
              prevIndices.map(index => 
                index.name === (data.symbol.includes('NIFTY') ? 'NIFTY' : 'SENSEX')
                  ? {
                      ...index,
                      value: price,
                      change: price - (index.value - index.change),
                      changePercent: ((price - (index.value - index.change)) / (index.value - index.change)) * 100
                    }
                  : index
              )
            );
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      if (!isMountedRef.current) return;
      console.error('WebSocket error:', err);
      setSocketStatus('error');
      scheduleReconnect();
    };

    ws.onclose = (e) => {
      if (!isMountedRef.current) return;
      setSocketStatus('disconnected');
      if (e.code !== 1000) {
        scheduleReconnect();
      }
    };
  };

  const scheduleReconnect = () => {
    if (!isMountedRef.current) return;
    if (reconnectTimerRef.current) return;
    
    reconnectTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      console.log('Attempting to reconnect...');
      setupWebSocket();
    }, 3000);
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (loading || stocks.length === 0) return;
    setupWebSocket();

    return () => {
      isMountedRef.current = false;
      if (socketRef.current) {
        try {
          stocks.forEach(stock => {
            socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: `BSE:${stock.symbol}` }));
          });
          socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: 'NSE:NIFTY_50' }));
          socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: 'BSE:SENSEX' }));
          socketRef.current.close(1000, 'Component unmounting');
        } catch (err) {
          console.error('Error during WebSocket cleanup:', err);
        }
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [loading, stocks]);

  // Fetch initial market data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch market indices
        const [niftyResponse, sensexResponse] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/quote?symbol=BSESN&token=${FINNHUB_API_KEY}`),
          fetch(`https://finnhub.io/api/v1/quote?symbol=BSE:SENSEX&token=${FINNHUB_API_KEY}`)
        ]);
        
        const [niftyData, sensexData] = await Promise.all([
          niftyResponse.json(),
          sensexResponse.json()
        ]);

        setMarketIndices([
          { name: 'NIFTY', number: '50', value: niftyData.c, change: niftyData.d, changePercent: niftyData.dp },
          { name: 'SENSEX', number: '', value: sensexData.c, change: sensexData.d, changePercent: sensexData.dp }
        ]);

        // Fetch stocks data
        const stockSymbols = [
          'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
          'TSLA', 'NVDA', 'NFLX', 'INTC', 'AMD',
          'ASML', 'QCOM', 'ADBE', 'CRM', 'AVGO',
          'MA', 'PYPL', 'BABA', 'MSTR', 'ORCL', 'IBM', 'UBER'
        ];

        const stockResponses = await Promise.all(
          stockSymbols.map(symbol => 
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
          )
        );

        const stockData = await Promise.all(stockResponses.map(res => res.json()));

        const initialStocks = stockSymbols.map((symbol, index) => ({
          symbol,
          price: stockData[index].c,
          change: stockData[index].d,
          changePercent: stockData[index].dp
        }));

        setStocks(initialStocks);
        setFilteredStocks(initialStocks);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Update wallet balance when user changes
  useEffect(() => {
    if (user?.walletBalance !== undefined) {
      setWalletBalance(user.walletBalance);
    }
  }, [user]);

  // Fetch user data when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUserData = async () => {
        try {
          const response = await fetch('/api/auth/user', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const data = await response.json();
          if (data.success) {
            setWalletBalance(data.user.walletBalance);
            updateWalletBalance(data.user.walletBalance);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      };
      fetchUserData();
    }
  }, [isAuthenticated, updateWalletBalance]);

  // Helper functions
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '--';
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const handleViewChart = (symbol, e) => {
    e.stopPropagation();
    navigate('/dashboard', { state: { showChart: true, chartSymbol: symbol } });
  };

  const handleOptionClick = (action, symbol, e, price) => {
    e.stopPropagation();
    if (action === 'Buy' || action === 'Sell') {
      setTradeModal({
        type: action.toUpperCase(),
        symbol,
        price
      });
    }
  };

  const handleGenerateSummary = (symbol, e) => {
    e.stopPropagation();
    navigate(`/ai-summary/${symbol}`);
  };

  const handleGeneratePrediction = (symbol, e) => {
    e.stopPropagation();
    navigate(`/ai-predict/${symbol}`);
  };

  const handleTradeSubmit = async (tradeData) => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) throw new Error('User not authenticated');
      
      const { token } = JSON.parse(storedUser);
      const response = await axios.post('/api/auth/trade', tradeData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        setWalletBalance(response.data.walletBalance);
        updateWalletBalance(response.data.walletBalance);
        setNotification({
          type: 'success',
          message: `${tradeData.type} order for ${tradeData.symbol} executed successfully!`
        });
        setTimeout(() => setNotification(null), 3000);
        setTradeModal(null);
      }
    } catch (err) {
      console.error('Trade error:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to execute trade. Please try again.'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (loading) {
    return <div className="watchlist-loading">Loading market data...</div>;
  }

  return (
    <div className="watchlist">
     

      {/* Modals */}
      {tradeModal && (
        <BuySellModal
          type={tradeModal.type}
          symbol={tradeModal.symbol}
          price={tradeModal.price}
          onClose={() => setTradeModal(null)}
          onSubmit={handleTradeSubmit}
          walletBalance={walletBalance}
        />
      )}

      {summaryModal && (
        <SummaryModal 
          symbol={summaryModal} 
          onClose={() => setSummaryModal(null)} 
        />
      )}

      {chartModalSymbol && (
        <ChartModal 
          symbol={chartModalSymbol} 
          onClose={() => setChartModalSymbol(null)} 
        />
      )}

     

      {/* Search Bar */}
      <div className="watchlist-search">
        <input
          type="text"
          placeholder="Search stocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Error Display */}
      {error && <div className="market-data-error">{error}</div>}

      {/* Search Results */}
      {searchTerm && (
        <div className="search-results-container">
          <h3>Search Results</h3>
          {searchLoading ? (
            <div className="loading">Searching stocks...</div>
          ) : searchResults.length === 0 ? (
            <div className="no-results">No stocks found matching your search</div>
          ) : (
            <div className="search-results-list">
              {searchResults.map((stock, i) => (
                <div key={i} className="search-result-item">
                  <div className="stock-info">
                    <div className="stock-symbol">{stock.symbol}</div>
                    <div className="stock-name">{stock.description}</div>
                  </div>
                  {userWatchlist.includes(stock.symbol) ? (
                    <button 
                      className="btn-remove"
                      onClick={() => removeFromWatchlist(stock.symbol)}
                    >
                      Remove
                    </button>
                  ) : (
                    <button 
                      className="btn-add"
                      onClick={() => addToWatchlist(stock.symbol)}
                    >
                      Add to Watchlist
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User's Watchlist */}
     {/* User's Watchlist */}
<div className="user-watchlist-container">
  <h3>Your Watchlist {isAuthenticated && userWatchlist.length > 0 && `(${userWatchlist.length})`}</h3>
  
  {!isAuthenticated ? (
    <div className="empty-watchlist">
      Please log in to view your watchlist
    </div>
  ) : userWatchlist.length === 0 ? (
    <div className="empty-watchlist">
      {searchTerm ? (
        'No matching stocks in your watchlist'
      ) : (
        'Your watchlist is empty. Search for stocks to add them.'
      )}
    </div>
  ) : (
    <div className="watchlist-stocks">
      {userWatchlist.map((symbol, i) => {
        // Find the stock in the main stocks list (if it exists)
        const stock = stocks.find(s => s.symbol === symbol);
        
        // Create stock data whether found or not
        const stockData = stock || {
          symbol,
          price: '--',
          change: 0,
          changePercent: 0
        };

        return (
          <div 
            key={i} 
            className="stock-row"
            onMouseEnter={() => setHoveredStock(i)}
            onMouseLeave={() => setHoveredStock(null)}
          >
            <div className="stock-info">
              <div className="stock-symboll">{stockData.symbol}</div>
              <div className={`stock-change ${stockData.change >= 0 ? 'positive' : 'negative'}`}>
                {stockData.change >= 0 ? (
                  <>
                    <i className="fa-solid fa-arrow-trend-up"></i> {formatNumber(stockData.change)}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-trend-down"></i> {formatNumber(Math.abs(stockData.change))}
                  </>
                )}
              </div>
            </div>
            <div className="stock-price">{formatNumber(stockData.price)}</div>
            
            {hoveredStock === i && (
              <div className="stock-options-tooltip" onMouseEnter={() => setHoveredStock(i)}>
                {stock && (
                  <>
                    <button 
                      className="option-button buy" 
                      onClick={(e) => handleOptionClick('Buy', stockData.symbol, e, stockData.price)}
                    >
                      Buy
                    </button>
                    <button 
                      className="option-button sell" 
                      onClick={(e) => handleOptionClick('Sell', stockData.symbol, e, stockData.price)}
                    >
                      Sell
                    </button>
                  </>
                )}
                <button 
                  className="option-button chart" 
                  onClick={(e) => handleViewChart(stockData.symbol, e)}
                >
                  Chart
                </button>
                <button 
                  className="option-button summary" 
                  onClick={(e) => handleGenerateSummary(stockData.symbol, e)}
                >
                  Summary
                </button>
                <button 
                  className="option-button predict" 
                  onClick={(e) => handleGeneratePrediction(stockData.symbol, e)}
                >
                  Predict
                </button>
                <button 
                  className="option-button remove" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(stockData.symbol);
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}
</div>
    </div>
  );
};

export default Watchlist;