import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { useNavigate, useLocation } from 'react-router-dom';
import NewsFeed from '../NewsFeed/NewsFeed';
import { useAuth } from '../../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import './Dashboard.css';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const location = useLocation();
  const [showChart, setShowChart] = useState(false);
  const [chartSymbol, setChartSymbol] = useState(null);
  const [currentChartData, setCurrentChartData] = useState(null);
  const [currentTimeRange, setCurrentTimeRange] = useState('3mo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [marketPrices, setMarketPrices] = useState({});
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [totalCurrentValue, setTotalCurrentValue] = useState(0);
  const [totalPnl, setTotalPnl] = useState(0);
  const [totalPnlPercent, setTotalPnlPercent] = useState(0);
  const navigate = useNavigate();
  const FINNHUB_API_KEY = 'd17tfrhr01qteuvpuh10d17tfrhr01qteuvpuh1g';

  // Initialize chart when navigating from Watchlist
  useEffect(() => {
    if (location.state?.showChart && location.state?.chartSymbol) {
      setShowChart(true);
      setChartSymbol(location.state.chartSymbol);
      // Clear the navigation state to prevent showing chart on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleCloseChart = () => {
    setShowChart(false);
    setChartSymbol(null);
  };

  // Fetch chart data when symbol changes
  useEffect(() => {
    if (chartSymbol) {
      fetchChartData(currentTimeRange);
    }
  }, [chartSymbol, currentTimeRange]);

  const fetchLivePrices = async (symbols) => {
    try {
      const pricePromises = symbols.map(symbol => 
        axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`)
      );
      
      const responses = await Promise.all(pricePromises);
      const newPrices = {};
      
      responses.forEach((response, index) => {
        if (response.data && response.data.c) {
          newPrices[symbols[index]] = response.data.c;
        }
      });
      
      setMarketPrices(prev => ({ ...prev, ...newPrices }));
    } catch (err) {
      console.error('Error fetching live prices:', err);
    }
  };

  useEffect(() => {
    if (user?.positions && Object.keys(marketPrices).length > 0) {
      const calculatedHoldings = user.positions.map(position => {
        const currentPrice = marketPrices[position.symbol] || position.ltp || position.avgPrice;
        const currentValue = position.quantity * currentPrice;
        const investment = position.quantity * position.avgPrice;
        const pnl = currentValue - investment;
        const pnlPercent = (pnl / investment) * 100;
        
        return {
          ...position,
          currentValue,
          investment,
          pnl,
          pnlPercent,
          currentPrice
        };
      });
      
      const newTotalCurrentValue = calculatedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
      const newTotalInvestment = calculatedHoldings.reduce((sum, h) => sum + h.investment, 0);
      const newTotalPnl = newTotalCurrentValue - newTotalInvestment;
      const newTotalPnlPercent = (newTotalPnl / newTotalInvestment) * 100;
      
      setHoldings(calculatedHoldings);
      setTotalCurrentValue(newTotalCurrentValue);
      setTotalInvestment(newTotalInvestment);
      setTotalPnl(newTotalPnl);
      setTotalPnlPercent(newTotalPnlPercent);
      setLoading(false);
    }
  }, [user, marketPrices]);

  useEffect(() => {
    if (user?.positions) {
      const symbols = user.positions.map(p => p.symbol);
      if (symbols.length > 0) {
        fetchLivePrices(symbols);
        const interval = setInterval(() => {
          fetchLivePrices(symbols);
        }, 30000);
        
        return () => clearInterval(interval);
      }
    }
  }, [user]);

  const getChartColors = (data) => {
    if (!data || !data.length) return { borderColor: '#3a80e9', backgroundColor: 'rgba(58, 128, 233, 0.3)' };
    
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    const isIncreasing = lastValue > firstValue;
    
    return {
      borderColor: isIncreasing ? '#4CAF50' : '#F44336',
      backgroundColor: isIncreasing ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '₹' + context.parsed.y.toFixed(2);
            }
            return label;
          },
          title: function(context) {
            return context[0].label;
          }
        }
      }
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 6,
        hoverBorderWidth: 2,
        hitRadius: 10
      },
      line: {
        tension: 0,
        fill: true,
        borderWidth: 2
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          drawBorder: false,
          color: '#f0f0f0',
        },
        ticks: {
          color: '#666',
          callback: function(value) {
            return '₹' + value.toFixed(1);
          }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#666',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'index',
      intersect: false
    }
  };

  const fetchChartData = async (timeRange) => {
  if (!chartSymbol) return;
  
  setLoading(true);
  setError(null);
  
  try {
    let range, interval;
    
    switch(timeRange) {
      case '1D': range = '1d'; interval = '5m'; break;
      case '5D': range = '5d'; interval = '15m'; break;
      case '1M': range = '1mo'; interval = '1d'; break;
      case '6M': range = '6mo'; interval = '1d'; break;
      case '1Y': range = '1y'; interval = '1wk'; break;
      case '5Y': range = '5y'; interval = '1mo'; break;
      default: range = '3mo'; interval = '1d';
    }
    
    const response = await axios.get(`/api/yahoo-finance/${chartSymbol}`, {
      params: {
        range,
        interval
      }
    });

    if (!response.data || !response.data.chart || !response.data.chart.result) {
      throw new Error('Invalid response from Yahoo Finance API');
    }

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const closes = quotes.close;

    const chartLabels = timestamps.map(timestamp => 
      timeRange === '1D' || timeRange === '5D'
        ? new Date(timestamp * 1000).toLocaleTimeString() 
        : new Date(timestamp * 1000).toLocaleDateString()
    );
    
    const colors = getChartColors(closes);
    
    setCurrentChartData({
      labels: chartLabels,
      datasets: [{
        label: `${chartSymbol} Price`,
        data: closes,
        borderColor: colors.borderColor,
        backgroundColor: colors.backgroundColor,
        borderWidth: 2,
        tension: 0,
        fill: true
      }],
      timeRange,
      symbol: chartSymbol
    });
    setCurrentTimeRange(timeRange);
  } catch (err) {
    console.error('Error fetching chart data:', err);
    setError('Failed to load chart data. Please try again later.');
  } finally {
    setLoading(false);
  }
};

  const getTimeRangeLabel = () => {
    switch(currentTimeRange) {
      case '1D': return '1 Day';
      case '5D': return '5 Days';
      case '1M': return '1 Month';
      case '6M': return '6 Months';
      case '1Y': return '1 Year';
      case '5Y': return '5 Years';
      default: return '3 Months';
    }
  };

  return (
    <div className="dashboard-content">
      <h2>Dashboard Overview</h2>
      {showChart && (
        <div className="chart-modal">
          <div className="chart-modal-content">
            <div className="chart-header">
              <h3>{chartSymbol} - {getTimeRangeLabel()} Price History</h3>
              <div className="chart-time-range-buttons">
                {['1D', '5D', '1M', '6M', '1Y', '5Y'].map((range) => (
                  <button 
                    key={range}
                    className={currentTimeRange === range ? 'active' : ''}
                    onClick={() => fetchChartData(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <button className="close-chart" onClick={handleCloseChart}>×</button>
            </div>
            <div className="chart-container">
              {loading ? (
                <div className="chart-loading">Loading chart data...</div>
              ) : error ? (
                <div className="chart-error">{error}</div>
              ) : currentChartData ? (
                <Line data={currentChartData} options={chartOptions} />
              ) : null}
            </div>
          </div>
        </div>
      )}
      
      
      <div className="dashboard-sections">
        <div className="dashboard">
          <div className="card-header">
            <h3>Equity</h3>
          </div>
          <div className="card-content">
            <div className="card-value">
              {user?.walletBalance?.toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                style: 'currency',
                currency: 'INR'
              }).replace('.00', '')}
              <span className="card-label">Margin available</span>
            </div>
            
            <div className="card-details">
              <div className="detail-item">
                <span className="detail-label">Margins used</span>
                <span className="detail-value">0</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Opening balance</span>
                <span className="detail-value">
                  {user?.walletBalance?.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                    style: 'currency',
                    currency: 'INR'
                  }).replace('.00', '')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard">
          <div className="card-header">
            <h3>Holdings ({holdings.length})</h3>
          </div>
          <div className="card-content">
            <div className="card-value">
              {totalPnl.toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                style: 'currency',
                currency: 'INR'
              }).replace('.00', '')}
              <span className={`pnl-percent ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
              </span>
              <span className="card-label">P&L</span>
            </div>
            
            <div className="card-details">
              <div className="detail-item">
                <span className="detail-label">Current Value</span>
                <span className="detail-value">
                  {totalCurrentValue.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                    style: 'currency',
                    currency: 'INR'
                  }).replace('.00', '')}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Investment</span>
                <span className="detail-value">
                  {totalInvestment.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                    style: 'currency',
                    currency: 'INR'
                  }).replace('.00', '')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <NewsFeed />
    </div>
  );
};

export default Dashboard;