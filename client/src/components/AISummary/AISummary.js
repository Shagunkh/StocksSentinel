import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import './AISummary.css';

const AISummary = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [customQueryResult, setCustomQueryResult] = useState(null);
  const [isCustomQuery, setIsCustomQuery] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [news, setNews] = useState([]);
  const [newsSummary, setNewsSummary] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');
  
  const chartContainerRef = useRef();
  const chartInstance = useRef(null);

  // API Keys
  const FINNHUB_API_KEY = 'd1aopp9r01qjhvtqeebgd1aopp9r01qjhvtqeec0';
  const OPENROUTER_API_KEY = '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';
  const ALPHA_VANTAGE_KEY = 'OH0ZQBRUAB4ABC4X';

  // Clean up chart instance safely
  const cleanupChart = useCallback(() => {
    if (chartInstance.current) {
      try {
        chartInstance.current.remove();
      } catch (e) {
        console.warn("Error during chart cleanup:", e);
      } finally {
        chartInstance.current = null;
      }
    }
  }, []);

  // Render chart with data
  const renderChart = useCallback((data) => {
    cleanupChart();
    
    const container = chartContainerRef.current;
    if (!container) return;
    
    container.innerHTML = ''; // Clear previous content
    
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        backgroundColor: '#ffffff',
        textColor: '#333',
      },
      grid: {
        vertLines: {
          color: '#eee',
        },
        horzLines: {
          color: '#eee',
        },
      },
      crosshair: {
        mode: 'normal',
      },
      timeScale: {
        borderColor: '#ccc',
      },
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
    
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    
    volumeSeries.setData(data.map(item => ({
      time: item.time,
      value: item.volume,
      color: item.close > item.open ? '#26a69a' : '#ef5350'
    })));
    
    chart.timeScale().fitContent();
  }, [cleanupChart]);

  // Render TradingView widget as fallback
  const renderTradingViewWidget = useCallback((stockSymbol) => {
    cleanupChart();
    
    const container = chartContainerRef.current;
    if (!container) return;
    
    container.innerHTML = ''; // Clear previous content
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        autosize: true,
        symbol: stockSymbol,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme: 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        container_id: 'tradingview-widget-container'
      });
    };
    
    container.appendChild(script);
    
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'tradingview-widget-container';
    widgetContainer.style.width = '100%';
    widgetContainer.style.height = '400px';
    container.appendChild(widgetContainer);
  }, [cleanupChart]);

  // Fetch stock chart data from Alpha Vantage
  const fetchStockChartData = useCallback(async (stockSymbol) => {
    try {
      // First try intraday data (1-5 minute intervals)
      let response = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${stockSymbol}&interval=5min&apikey=${ALPHA_VANTAGE_KEY}`
      );
      
      let timeSeries;
      if (response.data['Time Series (5min)']) {
        timeSeries = response.data['Time Series (5min)'];
      } else {
        // Fallback to daily data if intraday not available
        response = await axios.get(
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stockSymbol}&apikey=${ALPHA_VANTAGE_KEY}`
        );
        timeSeries = response.data['Time Series (Daily)'];
      }

      const chartData = Object.entries(timeSeries).map(([time, values]) => ({
        time: new Date(time).getTime() / 1000, // Convert to Unix timestamp
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseFloat(values['5. volume'])
      })).sort((a, b) => a.time - b.time); // Sort by time ascending
      
      renderChart(chartData);
    } catch (err) {
      console.error("Error fetching chart data:", err);
      // Fallback to TradingView widget if API fails
      renderTradingViewWidget(stockSymbol);
    }
  }, [ALPHA_VANTAGE_KEY, renderChart, renderTradingViewWidget]);

  // Fetch stock summary
  const fetchStockSummary = useCallback(async (stockSymbol, customQuestion = '') => {
    try {
      setLoading(true);
      setError(null);
      setIsCustomQuery(!!customQuestion);

      const messages = [
        { 
          "role": "system", 
          "content": "You are a financial analyst providing accurate stock information. Provide detailed responses with key metrics when available." 
        }
      ];

      if (customQuestion) {
        messages.push({
          "role": "user",
          "content": `${customQuestion} about ${stockSymbol} stock. Provide detailed analysis with numbers if available.`
        });
      } else {
        messages.push(
          {
            "role": "system",
            "content": "Provide a comprehensive analysis including company overview, recent performance, key metrics, and outlook. Keep it between 200-300 words."
          },
          {
            "role": "user",
            "content": `Provide a detailed analysis of ${stockSymbol} stock. Include important metrics like P/E ratio, market cap, dividend yield if available, and recent performance.`
          }
        );
      }

      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: "openai/gpt-3.5-turbo",
        messages: messages,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data.choices[0].message.content;
      
      if (customQuestion) {
        setCustomQueryResult(result);
      } else {
        setSummary(result);
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      setError('Failed to generate response. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [OPENROUTER_API_KEY]);

  // Fetch market news
  const fetchStockNews = useCallback(async (stockSymbol) => {
    try {
      const response = await axios.get(
        `https://finnhub.io/api/v1/company-news?symbol=${stockSymbol}&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${FINNHUB_API_KEY}`
      );
      
      const filteredNews = response.data
        .filter(item => item.headline && item.headline.toLowerCase().includes(stockSymbol.toLowerCase()))
        .slice(0, 5);
      
      setNews(filteredNews);
      
      // Generate news summary
      const headlines = filteredNews.map(item => item.headline).join('\n- ');
      const summaryResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: "openai/gpt-3.5-turbo",
        messages: [
          { 
            "role": "system", 
            "content": "You are a financial news analyst that summarizes recent market news about stocks." 
          },
          { 
            "role": "user", 
            "content": `Provide a concise 3-4 sentence summary of the key recent news about ${stockSymbol} based on these headlines:
                        - ${headlines}
                        
                        Focus on the most impactful developments and overall sentiment.`
          }
        ],
        max_tokens: 300
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      setNewsSummary(summaryResponse.data.choices[0].message.content);
    } catch (err) {
      console.error("Error fetching news:", err);
    }
  }, [FINNHUB_API_KEY, OPENROUTER_API_KEY]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current && chartContainerRef.current) {
        chartInstance.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupChart();
    };
  }, [cleanupChart]);

  // Load all data when symbol changes
  useEffect(() => {
    if (symbol) {
      setLoading(true);
      fetchStockSummary(symbol);
      fetchStockNews(symbol);
      fetchStockChartData(symbol);
    }
    
    return () => {
      cleanupChart();
    };
  }, [symbol, fetchStockSummary, fetchStockNews, fetchStockChartData, cleanupChart]);



  const handleQuerySubmit = (e) => {
    e.preventDefault();
    if (query.trim() && symbol) {
      fetchStockSummary(symbol, query);
      setQuery('');
    }
  };

  const handleStockSearch = (e) => {
    e.preventDefault();
    if (stockSearch.trim()) {
      navigate(`/ai-summary/${stockSearch.trim().toUpperCase()}`);
    }
  };

  if (!symbol) {
    return (
      <div className="ai-summary-container">
        <div className="ai-summary-header">
          <h2>Stock Analysis Tool</h2>
        </div>

        <div className="primary-search-section">
          <form onSubmit={handleStockSearch} className="primary-search-form">
            <input
              type="text"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Enter a stock symbol (e.g., AAPL, MSFT)"
              className="primary-search-input"
              autoFocus
            />
            <button type="submit" className="primary-search-button">
              Analyze Stock
            </button>
          </form>
          <p className="search-examples">
            Try: AAPL, MSFT, TSLA, GOOGL, AMZN
          </p>
        </div>

        <div className="welcome-message">
          <h3>Welcome to Stock Analysis AI</h3>
          <p>
            Get comprehensive AI-powered analysis of any publicly traded company.
            Enter a stock symbol above to begin.
          </p>
          <div className="features">
            <h4>Features:</h4>
            <ul>
              <li>Detailed company overview and financial metrics</li>
              <li>Recent performance analysis</li>
              <li>Latest market news with sentiment analysis</li>
              <li>Interactive 1-day stock chart</li>
              <li>Ability to ask specific questions about any stock</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-summary-container">
      <div className="ai-summary-header">
        <h2>{symbol.toUpperCase()} Stock Analysis</h2>
        <button onClick={() => navigate('/ai-summary')} className="back-button">
          Analyze Another Stock
        </button>
      </div>

      <div className="search-section">
        <form onSubmit={handleQuerySubmit} className="query-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask anything about ${symbol.toUpperCase()}...`}
            className="query-input"
          />
          <button type="submit" className="query-button">
            Ask
          </button>
        </form>
      </div>

      {/* Chart Section */}
      <div className="chart-section">
        <h3>{symbol.toUpperCase()} Price Chart</h3>
        <div 
          ref={chartContainerRef} 
          className="chart-container"
          style={{ width: '100%', height: '400px' }}
        />
      </div>
      
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          AI Analysis
        </button>
        <button 
          className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          Market News
        </button>
      </div>

      <div className="ai-summary-content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Generating AI-powered analysis...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Retry
            </button>
          </div>
        ) : isCustomQuery ? (
          <div className="query-result">
            <h3>Response to your query:</h3>
            <div className="result-text">
              {customQueryResult.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <button 
              onClick={() => setIsCustomQuery(false)} 
              className="show-original-button"
            >
              Show Full Analysis
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'analysis' && (
              <div className="summary-section">
                <h3>Comprehensive Analysis of {symbol.toUpperCase()}</h3>
                <div className="summary-text">
                  {summary.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="news-section">
                <h3>Latest News About {symbol.toUpperCase()}</h3>
                {newsSummary && (
                  <div className="news-summary">
                    <h4>News Summary:</h4>
                    <p>{newsSummary}</p>
                  </div>
                )}
                <div className="news-list">
                  {news.length > 0 ? (
                    news.map((item, index) => (
                      <div key={index} className="news-item">
                        <h4>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.headline}
                          </a>
                        </h4>
                        <p className="news-source">{item.source} - {new Date(item.datetime * 1000).toLocaleDateString()}</p>
                        <p className="news-summary">{item.summary || 'No summary available'}</p>
                      </div>
                    ))
                  ) : (
                    <p>No recent news found for {symbol.toUpperCase()}</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AISummary;