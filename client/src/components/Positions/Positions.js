import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import './Positions.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const FINNHUB_API_KEY = 'd17tfrhr01qteuvpuh10d17tfrhr01qteuvpuh1g';

const Positions = () => {
  const { user, isAuthenticated, updateWalletBalance } = useAuth();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketPrices, setMarketPrices] = useState({});
  const [pnlChartData, setPnlChartData] = useState(null);
  const [holdingsChartData, setHoldingsChartData] = useState(null);
  const [sellModal, setSellModal] = useState(null);
  const [notification, setNotification] = useState(null);
  const priceUpdateInterval = useRef(null);

  // Calculate net P&L
  const calculateNetPnL = () => {
    return positions.reduce((total, position) => {
      const currentPrice = marketPrices[position.symbol] || position.ltp || position.avgPrice;
      return total + ((currentPrice - position.avgPrice) * position.quantity);
    }, 0);
  };

  // Prepare P&L chart data
  const preparePnlChartData = () => {
    if (positions.length === 0) return null;

    const symbols = [];
    const pnlValues = [];
    const colors = [];

    positions.forEach(position => {
      const currentPrice = marketPrices[position.symbol] || position.ltp || position.avgPrice;
      const pnl = (currentPrice - position.avgPrice) * position.quantity;
      
      symbols.push(position.symbol);
      pnlValues.push(pnl);
      colors.push(pnl >= 0 ? '#4CAF50' : '#F44336');
    });

    return {
      labels: symbols,
      datasets: [
        {
          label: 'Profit & Loss',
          data: pnlValues,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        }
      ]
    };
  };

  // Prepare holdings distribution chart data
  const prepareHoldingsChartData = () => {
    if (positions.length === 0) return null;

    const symbols = [];
    const currentValues = [];
    const backgroundColors = [];

    // Generate distinct colors for each holding
    const colorPalette = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
      '#FF9F40', '#8AC24A', '#F06292', '#7986CB', '#A1887F'
    ];

    positions.forEach((position, index) => {
      const currentPrice = marketPrices[position.symbol] || position.ltp || position.avgPrice;
      const value = currentPrice * position.quantity;
      
      symbols.push(position.symbol);
      currentValues.push(value);
      backgroundColors.push(colorPalette[index % colorPalette.length]);
    });

    return {
      labels: symbols,
      datasets: [
        {
          data: currentValues,
          backgroundColor: backgroundColors,
          borderColor: '#fff',
          borderWidth: 1,
        }
      ]
    };
  };

  // Fetch live prices for all positions
  const fetchLivePrices = async (symbols) => {
    try {
      const pricePromises = symbols.map(symbol => 
        axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
      );
      
      const responses = await Promise.all(pricePromises);
      const newPrices = {};
      
      responses.forEach((response, index) => {
        if (response.data && response.data.c) {
          newPrices[symbols[index]] = response.data.c; // Current price
        }
      });
      
      setMarketPrices(prev => ({ ...prev, ...newPrices }));
      setPnlChartData(preparePnlChartData());
      setHoldingsChartData(prepareHoldingsChartData());
    } catch (err) {
      console.error('Error fetching live prices:', err);
    }
  };

  // Fetch initial positions data
  useEffect(() => {
    const fetchPositions = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const token = JSON.parse(localStorage.getItem('user'))?.token;
        if (!token) throw new Error('No authentication token found');

        const response = await axios.get('/api/auth/user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.success) {
          const userPositions = response.data.user.positions || [];
          setPositions(userPositions);
          
          // Initialize market prices with current LTP values
          const initialPrices = {};
          userPositions.forEach(pos => {
            initialPrices[pos.symbol] = pos.ltp || pos.avgPrice;
          });
          setMarketPrices(initialPrices);

          // Fetch live prices for all positions
          if (userPositions.length > 0) {
            const symbols = userPositions.map(p => p.symbol);
            await fetchLivePrices(symbols);
            
            // Set up interval for periodic price updates (every 10 seconds)
            priceUpdateInterval.current = setInterval(() => {
              fetchLivePrices(symbols);
            }, 10000);
          }
        }
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to load positions. Please try again.');
        if (user?.positions) {
          setPositions([...user.positions]);
          const initialPrices = {};
          user.positions.forEach(pos => {
            initialPrices[pos.symbol] = pos.ltp || pos.avgPrice;
          });
          setMarketPrices(initialPrices);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();

    return () => {
      // Cleanup interval
      if (priceUpdateInterval.current) {
        clearInterval(priceUpdateInterval.current);
      }
    };
  }, [user, isAuthenticated]);

  // Update chart data when positions or market prices change
  useEffect(() => {
    if (positions.length > 0 && Object.keys(marketPrices).length > 0) {
      setPnlChartData(preparePnlChartData());
      setHoldingsChartData(prepareHoldingsChartData());
    }
  }, [positions, marketPrices]);

  // Handle sell position
  const handleSellPosition = (position) => {
    setSellModal({
      symbol: position.symbol,
      price: marketPrices[position.symbol] || position.ltp || position.avgPrice,
      maxQuantity: position.quantity,
      product: position.product || 'CNC'
    });
  };

  // Submit sell order
 const handleSellSubmit = async (sellData) => {
  try {
    const token = JSON.parse(localStorage.getItem('user'))?.token;
    if (!token) throw new Error('No authentication token found');

    const response = await axios.post('/api/auth/trade', {
      symbol: sellData.symbol,
      quantity: sellData.quantity,
      price: sellData.price,
      product: sellData.product,
      type: 'SELL'  // Make sure to include the type
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.data.success) {
      // Update positions and wallet balance
      setPositions(response.data.user.positions || []);
      updateWalletBalance(response.data.user.walletBalance);
      
      setNotification({
        type: 'success',
        message: `Successfully sold ${sellData.quantity} shares of ${sellData.symbol}`
      });
      
      // Close modal
      setSellModal(null);
      
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    }
  } catch (err) {
    console.error('Error selling position:', err);
    setNotification({
      type: 'error',
      message: err.response?.data?.message || 'Failed to sell position. Please try again.'
    });
    setTimeout(() => setNotification(null), 3000);
  }
};

  if (loading) return <div className="loading">Loading positions...</div>;
  if (error) return <div className="error">{error}</div>;

  const netPnL = calculateNetPnL();

  return (
    <div className="positions-container">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {sellModal && (
        <div className="sell-modal">
          <div className="sell-modal-content">
            <div className="sell-modal-header">
              <h3>Sell {sellModal.symbol}</h3>
              <button className="close-modal" onClick={() => setSellModal(null)}>×</button>
            </div>
            <div className="sell-modal-body">
              <div className="sell-info">
                <div className="info-row">
                  <span>Current Price:</span>
                  <span>₹{sellModal.price.toFixed(2)}</span>
                </div>
                <div className="info-row">
                  <span>Available Qty:</span>
                  <span>{sellModal.maxQuantity}</span>
                </div>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSellSubmit({
                  symbol: sellModal.symbol,
                  quantity: parseInt(e.target.quantity.value),
                  price: sellModal.price,
                  product: sellModal.product
                });
              }}>
                <div className="form-group">
                  <label>Quantity:</label>
                  <input 
                    type="number" 
                    name="quantity"
                    min="1"
                    max={sellModal.maxQuantity}
                    defaultValue="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Product:</label>
                  <select name="product" defaultValue={sellModal.product}>
                    <option value="CNC">CNC</option>
                    <option value="MIS">MIS</option>
                    <option value="NRML">NRML</option>
                  </select>
                </div>
                <button type="submit" className="sell-button">Sell</button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="connection-status">
        Market Data: 🔴 Live (10s refresh)
      </div>
      
      <h2>Your Positions</h2>
      
      {/* Net P&L Summary */}
      <div className={`net-pnl ${netPnL >= 0 ? 'positive' : 'negative'}`}>
        <h3>Net Profit & Loss</h3>
        <div className="pnl-value">₹{netPnL.toFixed(2)}</div>
        <div className="pnl-percent">
          {positions.length > 0 ? 
            `${((netPnL / positions.reduce((total, pos) => total + (pos.avgPrice * pos.quantity), 0)) * 100).toFixed(2)}%` : 
            '0.00%'}
        </div>
      </div>
      
      {positions && positions.length > 0 ? (
        <>
          <div className="table-responsive">
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Instrument</th>
                  <th>Qty.</th>
                  <th>Avg.</th>
                  <th>LTP</th>
                  <th>P&L</th>
                  <th>Chg.</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const currentPrice = marketPrices[position.symbol] || position.ltp || position.avgPrice;
                  const pnl = (currentPrice - position.avgPrice) * position.quantity;
                  const change = position.avgPrice 
                    ? ((currentPrice - position.avgPrice) / position.avgPrice) * 100
                    : 0;
                  
                  return (
                    <tr key={`${position.symbol}-${position.product}`}>
                      <td>{position.product || 'CNC'}</td>
                      <td>{position.symbol || 'N/A'}</td>
                      <td>{position.quantity || 0}</td>
                      <td>₹{(position.avgPrice || 0).toFixed(2)}</td>
                      <td>₹{currentPrice.toFixed(2)}</td>
                      <td className={pnl >= 0 ? 'positive' : 'negative'}>
                        ₹{pnl.toFixed(2)}
                      </td>
                      <td className={change >= 0 ? 'positive' : 'negative'}>
                        {change.toFixed(2)}%
                      </td>
                      <td>
                        <button 
                          className="sell-btn"
                          onClick={() => handleSellPosition(position)}
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Charts Section */}
          <div className="charts-grid">
            {/* Current P&L Chart */}
            <div className="chart-container">
              <h3>Current Profit & Loss by Stock</h3>
              <div className="chart-wrapper">
                {pnlChartData ? (
                  <Bar 
                    data={pnlChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `₹${context.raw.toFixed(2)}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: false,
                          ticks: {
                            callback: function(value) {
                              return '₹' + value.toFixed(2);
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="loading">Loading P&L chart...</div>
                )}
              </div>
            </div>
            
            {/* Holdings Distribution Chart */}
            <div className="chart-container">
              <h3>Holdings Distribution</h3>
              <div className="chart-wrapper">
                {holdingsChartData ? (
                  <Doughnut 
                    data={holdingsChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const value = context.raw;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${context.label}: ₹${value.toFixed(2)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="loading">Loading holdings chart...</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="no-positions">You don't have any open positions.</p>
      )}

      {/* Add CSS styles */}
      <style jsx>{`
          .net-pnl {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          background: #f8f9fa;
          
         
        }
     
        .pnl-value {
          font-size: 4rem;
          font-weight: bold;
        }
        
        .table-responsive {
          overflow-x: auto;
          margin-bottom: 30px;
        }
        
        .positions-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .positions-table th, .positions-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .positions-table th {
          background-color:rgb(18, 17, 17);
          font-weight: 600;
        }
        
        .positive {
          color: #4CAF50;
        }
        
        .negative {
          color: #F44336;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 30px;
        }
        
        .chart-container {
         
          border-radius: 8px;
          padding: 15px;
          background: #121212;
         
        }
        
        .chart-wrapper {
          height: 300px;
          position: relative;
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .positive {
          color: #4CAF50;
        }
        
        .negative {
          color: #F44336;
        }
        
        .sell-btn {
          background-color: #F44336;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .sell-btn:hover {
          background-color: #D32F2F;
        }
        
       
        .sell-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .sell-modal-content {
          background: white;
          border-radius: 8px;
          width: 400px;
          max-width: 90%;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .sell-modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .close-modal {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #777;
        }
        
        .sell-modal-body {
          padding: 20px;
        }
        
        .sell-info {
          margin-bottom: 20px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-group input, .form-group select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .sell-button {
          width: 100%;
          padding: 10px;
          background-color: #F44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.3s;
        }
        
        .sell-button:hover {
          background-color: #D32F2F;
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 20px;
          border-radius: 4px;
          color: white;
          z-index: 1000;
          animation: slideIn 0.3s, fadeOut 0.5s 2.5s forwards;
        }
        
        .notification.success {
          background-color: #4CAF50;
        }
        
        .notification.error {
          background-color: #F44336;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .positions-table th, .positions-table td {
            padding: 8px 10px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Positions;