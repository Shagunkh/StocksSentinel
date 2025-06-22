import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './AIPrediction.css';

const AIPrediction = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [news, setNews] = useState([]);
  const [priceData, setPriceData] = useState(null);
  const [technicalIndicators, setTechnicalIndicators] = useState(null);
  const [marketSentiment, setMarketSentiment] = useState(null);
  const [volumeData, setVolumeData] = useState({ average: null, current: null, trend: null });
  const [priceTrend, setPriceTrend] = useState({ direction: null, strength: null });

  // API Keys (consider moving these to environment variables)
  const FINNHUB_API_KEY = 'd1aopp9r01qjhvtqeebgd1aopp9r01qjhvtqeec0';
  const OPENROUTER_API_KEY = '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';
  const ALPHA_VANTAGE_KEY = 'OH0ZQBRUAB4ABC4X';
  const POLYGON_API_KEY = 'TpJTOM9gDn4q_3d1L0Gyp4mFlap7OSLh';
  const TWELVE_DATA_KEY = '689a986b8a534491b05fff638cd7f1b1';

  // Clean AI response by removing markdown and formatting
  const cleanPredictionText = (text) => {
    return text
      .replace(/^#+\s*/gm, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove markdown links
      .split('\n')
      .filter(line => line.trim() !== '') // Remove empty lines
      .map(line => line.trim());
  };

  // Fetch technical indicators from multiple sources
  const fetchTechnicalIndicators = async (symbol) => {
    try {
      // Fetch from Alpha Vantage
      const alphaResponse = await axios.get(
        `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`
      );
      
      // Fetch from Twelve Data (fallback)
      const twelveResponse = await axios.get(
        `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=1day&outputsize=30&apikey=${TWELVE_DATA_KEY}`
      );
      
      // Process indicators
      const indicators = {
        rsi: alphaResponse.data?.TechnicalAnalysis?.RSI || twelveResponse.data?.values?.[0]?.rsi || null,
        // Add more indicators as needed
      };
      
      setTechnicalIndicators(indicators);
      return indicators;
    } catch (err) {
      console.error("Error fetching technical indicators:", err);
      return null;
    }
  };

  // Fetch broader market sentiment
 const fetchMarketSentiment = async () => {
  try {
    // Fetch fear and greed index
    const fgiResponse = await axios.get(
      'https://api.alternative.me/fng/?limit=1'
    );
    
    // Fetch major indices performance
    const indicesResponse = await axios.get(
      `https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=SPY,QQQ,DIA&apikey=${ALPHA_VANTAGE_KEY}`
    );
    
    console.log(indicesResponse);
    // Correct the property name from StockQuotes to Stock Quotes
    const quotes = indicesResponse.data['Stock Quotes'] || [];
    
    const sentimentData = {
      fearGreedIndex: fgiResponse.data?.data?.[0]?.value || null,
      spyChange: quotes[0]?.['09. change'] || null,
      qqqChange: quotes[1]?.['09. change'] || null,
      diaChange: quotes[2]?.['09. change'] || null,
    };
    
    setMarketSentiment(sentimentData);
    return sentimentData;
  } catch (err) {
    console.error("Error fetching market sentiment:", err);
    return null;
  }
};

  // Enhanced sentiment analysis with NLP techniques
  const calculateEnhancedSentiment = (priceChange, newsItems, technicalIndicators, marketSentiment) => {
    // Base sentiment from price change (-1 to 1)
    const priceChangeNum = parseFloat(priceChange) || 0;
    let sentimentScore = Math.min(1, Math.max(-1, priceChangeNum / 5));
    
    // Technical indicators influence
    if (technicalIndicators?.rsi) {
      const rsi = parseFloat(technicalIndicators.rsi);
      // RSI between 30-70 is neutral, below 30 is oversold (bullish), above 70 is overbought (bearish)
      const rsiInfluence = rsi < 30 ? 0.2 : rsi > 70 ? -0.2 : 0;
      sentimentScore += rsiInfluence;
    }
    
    // Market sentiment influence
    if (marketSentiment) {
      // Fear and greed index (0-100, 0=extreme fear, 100=extreme greed)
      const fgi = parseFloat(marketSentiment.fearGreedIndex) || 50;
      const fgiInfluence = (fgi - 50) / 100; // Normalize to -0.5 to 0.5
      sentimentScore += fgiInfluence * 0.3;
      
      // Major indices performance
      const spyChange = parseFloat(marketSentiment.spyChange) || 0;
      const qqqChange = parseFloat(marketSentiment.qqqChange) || 0;
      const diaChange = parseFloat(marketSentiment.diaChange) || 0;
      const marketPerformance = (spyChange + qqqChange + diaChange) / 3;
      sentimentScore += marketPerformance / 10;
    }
    
    // Enhanced news analysis with more sophisticated NLP
    if (newsItems && newsItems.length > 0) {
      let newsSentiment = 0;
      const sentimentWords = {
        positive: ['up', 'rise', 'gain', 'strong', 'beat', 'bullish', 'buy', 'outperform', 'positive', 'growth'],
        negative: ['down', 'fall', 'drop', 'weak', 'miss', 'bearish', 'sell', 'underperform', 'negative', 'decline'],
        strongPositive: ['surge', 'soar', 'rocket', 'record high', 'breakout', 'upgrade'],
        strongNegative: ['plunge', 'crash', 'collapse', 'record low', 'downgrade', 'bankrupt']
      };
      
      newsItems.forEach(item => {
        const headline = item.headline.toLowerCase();
        const summary = (item.summary || '').toLowerCase();
        
        // Check for sentiment words with different weights
        sentimentWords.strongPositive.forEach(word => {
          if (headline.includes(word) || summary.includes(word)) {
            newsSentiment += 0.3;
          }
        });
        
        sentimentWords.positive.forEach(word => {
          if (headline.includes(word) || summary.includes(word)) {
            newsSentiment += 0.1;
          }
        });
        
        sentimentWords.negative.forEach(word => {
          if (headline.includes(word) || summary.includes(word)) {
            newsSentiment -= 0.1;
          }
        });
        
        sentimentWords.strongNegative.forEach(word => {
          if (headline.includes(word) || summary.includes(word)) {
            newsSentiment -= 0.3;
          }
        });
        
        // Check for sentiment shifters
        if (headline.includes('but') || summary.includes('however')) {
          newsSentiment *= 0.7; // Reduce sentiment impact for contradictory statements
        }
        
        if (headline.includes('!')) {
          newsSentiment *= 1.2; // Amplify sentiment for emphatic statements
        }
      });
      
      // Average news sentiment and combine with other factors
      newsSentiment = newsSentiment / newsItems.length;
      sentimentScore = (sentimentScore * 0.5) + (newsSentiment * 0.3) + 
                      ((technicalIndicators ? 0.1 : 0) + (marketSentiment ? 0.1 : 0));
    }
    
    // Normalize between -1 and 1
    sentimentScore = Math.min(1, Math.max(-1, sentimentScore));
    
    // Determine sentiment label with more granularity
    let sentimentLabel;
    if (sentimentScore > 0.6) {
      sentimentLabel = 'extremely bullish';
    } else if (sentimentScore > 0.3) {
      sentimentLabel = 'strongly bullish';
    } else if (sentimentScore > 0.1) {
      sentimentLabel = 'bullish';
    } else if (sentimentScore < -0.6) {
      sentimentLabel = 'extremely bearish';
    } else if (sentimentScore < -0.3) {
      sentimentLabel = 'strongly bearish';
    } else if (sentimentScore < -0.1) {
      sentimentLabel = 'bearish';
    } else {
      sentimentLabel = 'neutral';
    }
    
    return {
      score: sentimentScore.toFixed(2),
      label: sentimentLabel,
      confidence: Math.abs(sentimentScore) > 0.5 ? 'high' : 
                 Math.abs(sentimentScore) > 0.2 ? 'medium' : 'low'
    };
  };

  // Fetch historical data for trend analysis with fallbacks
  const fetchHistoricalData = async (symbol) => {
    try {
      // Try Alpha Vantage first
      const alphaResponse = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`
      );
      
      let timeSeries = alphaResponse.data['Time Series (Daily)'];
      let source = 'Alpha Vantage';
      
      // Fallback to Twelve Data if Alpha Vantage fails
      if (!timeSeries) {
        const twelveResponse = await axios.get(
          `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=5&apikey=${TWELVE_DATA_KEY}`
        );
        timeSeries = twelveResponse.data?.values?.reduce((acc, val) => {
          acc[val.datetime] = {
            '4. close': val.close,
            '5. volume': val.volume
          };
          return acc;
        }, {});
        source = 'Twelve Data';
      }
      
      // Fallback to Polygon if both fail
      if (!timeSeries) {
        const polygonResponse = await axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}/${new Date().toISOString().split('T')[0]}?apiKey=${POLYGON_API_KEY}`
        );
        timeSeries = polygonResponse.data?.results?.reduce((acc, val) => {
          const date = new Date(val.t).toISOString().split('T')[0];
          acc[date] = {
            '4. close': val.c,
            '5. volume': val.v
          };
          return acc;
        }, {});
        source = 'Polygon';
      }
      
      if (!timeSeries) {
        console.log("No historical data available from any source");
        return null;
      }
      
      const dates = Object.keys(timeSeries).sort();
      const last5Days = dates.slice(0, 5).map(date => ({
        date,
        close: parseFloat(timeSeries[date]['4. close']),
        volume: parseFloat(timeSeries[date]['5. volume'])
      }));
      
      // Calculate short-term trend
      const priceChange = last5Days[0].close - last5Days[last5Days.length - 1].close;
      const percentChange = (priceChange / last5Days[last5Days.length - 1].close) * 100;
      
      const trend = {
        direction: priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'flat',
        strength: Math.abs(percentChange) > 5 ? 'strong' : 
                 Math.abs(percentChange) > 2 ? 'moderate' : 'weak',
        percentChange: percentChange.toFixed(2)
      };
      
      // Calculate volume metrics
      const volumes = last5Days.map(day => day.volume).filter(v => v);
      const avgVolume = volumes.length > 0 ? 
        volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length : 
        null;
      
      const volumeTrend = volumes.length > 1 ? 
        volumes[0] > volumes[volumes.length - 1] * 1.2 ? 'increasing' :
        volumes[0] < volumes[volumes.length - 1] * 0.8 ? 'decreasing' : 'stable' : 
        'unknown';
      
      setPriceTrend(trend);
      setVolumeData({
        average: avgVolume,
        current: last5Days[0]?.volume || null,
        trend: volumeTrend,
        source
      });
      
      return {
        last5Days,
        trend,
        volume: last5Days[0]?.volume || null,
        source
      };
    } catch (err) {
      console.error("Error fetching historical data:", err);
      return null;
    }
  };

  // Generate AI prediction with enhanced data
  const generateEnhancedPrediction = async (stockSymbol) => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Gather all data from APIs in parallel
      const [
        priceResponse, 
        newsResponse,
        technicalIndicators,
        marketSentiment,
        historicalData
      ] = await Promise.all([
        axios.get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=${ALPHA_VANTAGE_KEY}`),
        axios.get(`https://finnhub.io/api/v1/company-news?symbol=${stockSymbol}&from=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${FINNHUB_API_KEY}`),
        fetchTechnicalIndicators(stockSymbol),
        fetchMarketSentiment(),
        fetchHistoricalData(stockSymbol)
      ]);

      // Process price data
      const priceData = priceResponse.data['Global Quote'] || {};
      const priceChange = priceData['10. change percent'] || '0%';
      setPriceData({
        current: priceData['05. price'],
        change: priceData['09. change'],
        changePercent: priceChange,
        volume: volumeData.current || historicalData?.volume || null
      });

      // Process news data
      const recentNews = newsResponse.data
        .filter(item => item.headline && item.image && item.url)
        .slice(0, 5);
      setNews(recentNews);

      // Calculate enhanced sentiment
      const sentimentAnalysis = calculateEnhancedSentiment(
        priceChange, 
        recentNews,
        technicalIndicators,
        marketSentiment
      );
      setSentiment(sentimentAnalysis);

      // Prepare comprehensive data for AI
      const latestNews = recentNews.length > 0 ? 
        recentNews.slice(0, 3).map(item => item.headline).join('\n- ') : 
        'No recent news available';
      
      const technicalSummary = technicalIndicators ? 
        `RSI: ${technicalIndicators.rsi || 'N/A'}` : 
        'No technical indicators available';
      
      const marketSummary = marketSentiment ? 
        `Market Sentiment: Fear/Greed Index ${marketSentiment.fearGreedIndex || 'N/A'}, 
         SPY: ${marketSentiment.spyChange || 'N/A'}, 
         QQQ: ${marketSentiment.qqqChange || 'N/A'}, 
         DIA: ${marketSentiment.diaChange || 'N/A'}` : 
        'No market sentiment data available';
      
      const historicalSummary = historicalData ? 
        `Recent trend: ${priceTrend.direction} (${priceTrend.strength}, ${priceTrend.percentChange}%), 
         Volume: ${volumeData.current ? volumeData.current.toLocaleString() : 'N/A'} (${volumeData.trend}), 
         Avg Volume: ${volumeData.average ? volumeData.average.toLocaleString() : 'N/A'}` : 
        'Limited historical data available';

      // Step 2: Send to AI for enhanced prediction
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: "anthropic/claude-3-haiku",
        messages: [
          { 
            "role": "system", 
            "content": `You are an advanced stock prediction AI that analyzes multiple data points to forecast stock movements.
                        Provide a detailed prediction for the next 24 hours including:
                        - Predicted direction and percentage change with confidence interval
                        - Key technical factors (RSI, volume, trends)
                        - Market sentiment context
                        - News sentiment analysis
                        - Potential support/resistance levels
                        - Risk factors to consider
                        - Trading strategy suggestion (if appropriate)
                        - Important disclaimer about predictions being speculative
                        
                        Format your response with clear sections using markdown headers and bullet points.
                        Current sentiment: ${sentimentAnalysis.label} (${sentimentAnalysis.score})
                        Confidence: ${sentimentAnalysis.confidence}`
          },
          { 
            "role": "user", 
            "content": `Generate a comprehensive 24-hour prediction for ${stockSymbol} based on:
                        - Current price: ${priceData['05. price']}
                        - Price change: ${priceChange}
                        - Volume: ${volumeData.current?.toLocaleString() || 'N/A'} (${volumeData.trend || 'trend unknown'})
                        - Avg Volume: ${volumeData.average?.toLocaleString() || 'N/A'}
                        - Price Trend: ${priceTrend.direction || 'unknown'} (${priceTrend.strength || 'unknown'}, ${priceTrend.percentChange || 'N/A'}%)
                        - Technical indicators: ${technicalSummary}
                        - Market context: ${marketSummary}
                        - Latest news headlines:
                          - ${latestNews}`
          }
        ],
        max_tokens: 1500
      }, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const cleanedPrediction = cleanPredictionText(response.data.choices[0].message.content);
      setPrediction(cleanedPrediction);

    } catch (err) {
      console.error("Error generating prediction:", err);
      setError('Failed to generate prediction. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch additional market data
  const fetchStockNews = async (stockSymbol) => {
    try {
      // Try multiple news sources
      const [finnhubNews, polygonNews] = await Promise.all([
        axios.get(
          `https://finnhub.io/api/v1/company-news?symbol=${stockSymbol}&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${FINNHUB_API_KEY}`
        ),
        axios.get(
          `https://api.polygon.io/v2/reference/news?ticker=${stockSymbol}&limit=5&apiKey=${POLYGON_API_KEY}`
        ).catch(() => ({ data: { results: [] }})) // Fallback if fails
      ]);
      
      // Combine and filter news
      const allNews = [
        ...(finnhubNews.data || []),
        ...(polygonNews.data?.results || [])
      ];
      
      const filteredNews = allNews
        .filter(item => item.headline && (item.image || item.thumbnail_url) && item.url)
        .slice(0, 5)
        .map(item => ({
          headline: item.headline || item.title,
          summary: item.summary || item.description,
          image: item.image || item.thumbnail_url,
          url: item.url || item.article_url,
          source: item.source || (item.publisher ? item.publisher.name : 'Unknown'),
          date: item.datetime || item.published_utc
        }));
      
      setNews(filteredNews);
    } catch (err) {
      console.error("Error fetching news:", err);
    }
  };

  // Load all data when symbol changes
  useEffect(() => {
    if (symbol) {
      setLoading(true);
      generateEnhancedPrediction(symbol);
      fetchStockNews(symbol);
    }
  }, [symbol]);

  if (!symbol) {
    return (
      <div className="ai-prediction-container">
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h3>No Stock Selected</h3>
          <p>Please select a stock symbol to view AI predictions</p>
          <button onClick={() => navigate('/watchlist')} className="primary-button">
            Browse Stocks
          </button>
        </div>
      </div>
    );
  }
return (
    <div className="ai-prediction-container dark-theme">
      <div className="ai-prediction-header">
        <div className="header-content">
          <div className="stock-header">
            <h1 className="stock-symbol">{symbol.toUpperCase()}</h1>
            {priceData && (
              <div className="price-container">
                
                {priceData.volume && (
                  <div className="volume-display">
                    <span className="volume-label">VOLUME:</span>
                    <span className="volume-value">{priceData.volume.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="stock-name">Advanced 24-Hour AI Prediction Analysis</p>
        </div>
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-animation">
            <div className="loading-spinner"></div>
          </div>
          <p>Analyzing market data for {symbol.toUpperCase()}...</p>
          <p className="loading-subtext">Fetching price data, news, and technical indicators</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Prediction Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="primary-button">
            Retry Analysis
          </button>
        </div>
      ) : (
        <>
         {prediction && (
  <div className="prediction-section">
    <div className="prediction-card glass-card">
      <div className="card-header">
        <div className="sentiment-header">
          <h2 className="prediction-title">
            <span className="title-icon">✨AI</span>
            AI Stock Analysis
          </h2>
          <div className={`sentiment-indicator ${sentiment.label.replace(' ', '-')}`}>
            <div className="sentiment-badge">
              <span className="sentiment-label">{sentiment.label}</span>
              <span className="sentiment-confidence-bubble">{sentiment.confidence} confidence</span>
            </div>
            <div className="sentiment-meter">
              <div 
                className="meter-fill" 
                style={{
                  width: `${(parseFloat(sentiment.score) + 1) * 50}%`,
                  background: sentiment.score >= 0 ? 
                    `linear-gradient(90deg, #00C805 ${Math.abs(sentiment.score) * 100}%, #f0f0f0 0%)` :
                    `linear-gradient(90deg, #FF3B30 ${Math.abs(sentiment.score) * 100}%, #f0f0f0 0%)`
                }}
              ></div>
              <div className="meter-labels">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="prediction-content">
        
        
        <div className="full-prediction">
          <h3>Detailed Analysis</h3>
          {prediction.map((line, i) => (
            <p key={i} className="prediction-line">
              {line.startsWith('**') ? (
                <strong>{line.replace(/\*\*/g, '')}</strong>
              ) : (
                line
              )}
            </p>
          ))}
        </div>
      </div>
      
      <div className="prediction-footer">
        <div className="action-bar">
          <button 
            onClick={() => generateEnhancedPrediction(symbol)} 
            className="refresh-button"
          >
            <span className="refresh-icon">🔄</span> Update Analysis
          </button>
          <div className="last-updated">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        <div className="disclaimer">
          <div className="disclaimer-icon">⚠️</div>
          <p>
            <strong>Disclaimer:</strong> This AI-generated forecast is for informational purposes only 
            and should not be considered financial advice. Past performance is not indicative 
            of future results.
          </p>
        </div>
      </div>
    </div>
  </div>
)}

          <div className="data-sections">
            <div className="technical-section">
              <h2 className="section-title">Technical Indicators</h2>
              <div className="indicators-grid">
                <div className="indicator-card glass-card">
                  <h3>RSI (14-day)</h3>
                  <div className="indicator-value-container">
                    <span className="indicator-value">{technicalIndicators?.rsi || '--'}</span>
                    <div className={`indicator-status ${
                      !technicalIndicators?.rsi ? 'neutral' : 
                      technicalIndicators.rsi > 70 ? 'overbought' : 
                      technicalIndicators.rsi < 30 ? 'oversold' : 'neutral'
                    }`}>
                      {!technicalIndicators?.rsi ? 'N/A' : 
                       technicalIndicators.rsi > 70 ? 'Overbought' : 
                       technicalIndicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                    </div>
                  </div>
                </div>
                
                <div className="indicator-card glass-card">
                  <h3>Price Trend</h3>
                  <div className="indicator-value-container">
                    {priceTrend.direction ? (
                      <>
                        <span className={`trend-direction ${priceTrend.direction}`}>
                          {priceTrend.direction.toUpperCase()}
                        </span>
                        <span className="trend-strength">
                          {priceTrend.strength} ({priceTrend.percentChange}%)
                        </span>
                      </>
                    ) : (
                      <span className="no-data">No trend data</span>
                    )}
                  </div>
                </div>
                
                <div className="indicator-card glass-card">
                  <h3>Volume Analysis</h3>
                  <div className="volume-metrics">
                    <div className="volume-metric">
                      <span className="metric-label">Current:</span>
                      <span className="metric-value">
                        {volumeData.current ? volumeData.current.toLocaleString() : '--'}
                      </span>
                    </div>
                    <div className="volume-metric">
                      <span className="metric-label">Average:</span>
                      <span className="metric-value">
                        {volumeData.average ? volumeData.average.toLocaleString() : '--'}
                      </span>
                    </div>
                    <div className="volume-trend">
                      <span className="trend-label">Trend:</span>
                      <span className={`trend-value ${volumeData.trend || 'unknown'}`}>
                        {volumeData.trend || 'unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="market-section">
              <h2 className="section-title">Market Sentiment</h2>
              {marketSentiment ? (
                <div className="market-grid">
                  <div className="market-card glass-card">
                    <h3>Fear & Greed Index</h3>
                    <div className="gauge-container">
                      <div 
                        className="gauge-fill" 
                        style={{ width: `${marketSentiment.fearGreedIndex}%` }}
                      ></div>
                      <span className="gauge-value">{marketSentiment.fearGreedIndex}</span>
                    </div>
                    <p className="market-analysis">
                      {marketSentiment.fearGreedIndex > 70 ? 'Extreme Greed' :
                       marketSentiment.fearGreedIndex < 30 ? 'Extreme Fear' : 'Neutral'}
                    </p>
                  </div>
                  
                  <div className="market-card glass-card">
                    <h3>SPY (S&P 500)</h3>
                    <div className={`index-change ${marketSentiment.spyChange >= 0 ? 'positive' : 'negative'}`}>
                      {marketSentiment.spyChange || '--'}
                    </div>
                  </div>
                  
                  <div className="market-card glass-card">
                    <h3>QQQ (Nasdaq)</h3>
                    <div className={`index-change ${marketSentiment.qqqChange >= 0 ? 'positive' : 'negative'}`}>
                      {marketSentiment.qqqChange || '--'}
                    </div>
                  </div>
                  
                  <div className="market-card glass-card">
                    <h3>DIA (Dow Jones)</h3>
                    <div className={`index-change ${marketSentiment.diaChange >= 0 ? 'positive' : 'negative'}`}>
                      {marketSentiment.diaChange || '--'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-market">
                  <p>No market sentiment data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="news-section">
            <div className="section-header">
              <h2 className="section-title">Latest Market News</h2>
              <button onClick={() => fetchStockNews(symbol)} className="refresh-news">
                ↻ Refresh News
              </button>
            </div>
            {news.length > 0 ? (
              <div className="news-grid">
                {news.map((item, index) => (
                  <div key={index} className="news-card glass-card">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <div className="news-image-container">
                        <img 
                          src={item.image} 
                          alt={item.headline} 
                          className="news-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                          }}
                        />
                      </div>
                      <div className="news-content">
                        <h3 className="news-headline">{item.headline}</h3>
                        <div className="news-meta">
                          <span className="news-source">{item.source}</span>
                          <span className="news-date">
                            {item.date ? new Date(item.date).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                        <p className="news-summary">{item.summary || 'Read more...'}</p>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-news">
                <p>No recent news found for {symbol.toUpperCase()}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};


export default AIPrediction;