// src/components/NewsFeed/NewsFeed.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NewsFeed.css';

const FINNHUB_API_KEY = 'd17tfrhr01qteuvpuh10d17tfrhr01qteuvpuh1g';

const NewsFeed = ({ symbol }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaries, setSummaries] = useState({});

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`;
        if (symbol) {
          url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateString(-7)}&to=${getDateString(0)}&token=${FINNHUB_API_KEY}`;
        }

        const response = await axios.get(url);
        
        // Filter out articles without images and with "undefined" headlines
        const filteredNews = response.data.filter(article => 
          article.image && article.image !== '' && 
          article.headline && article.headline !== 'undefined'
        ).slice(0, 20); // Limit to 20 articles
        
        setNews(filteredNews);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load news. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [symbol]);

  const getDateString = (daysOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleArticle = (id) => {
    setExpandedArticle(expandedArticle === id ? null : id);
  };

  const fetchSummary = async (articleId, url) => {
    if (summaries[articleId]) return;
    
    try {
      setSummaryLoading(true);
      
      // In a real app, you would call your backend API to fetch the summary
      // This is a mock implementation that shows how it would work
      const mockSummary = "This is a simulated summary of the article. In a real implementation, you would call a summarization API or your backend service to generate this based on the article content.";
      
      setSummaries(prev => ({
        ...prev,
        [articleId]: mockSummary
      }));
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="news-feed loading">
        <div className="loading-spinner"></div>
        <p>Loading news...</p>
      </div>
    );
  }

  if (error) {
    return <div className="news-feed error">{error}</div>;
  }

  return (
    <div className="news-feed">
      <h2>{symbol ? `${symbol} News` : 'Market News'}</h2>
      
      <div className="news-grid">
        {news.map(article => (
          <div 
            key={article.id} 
            className={`news-card ${expandedArticle === article.id ? 'expanded' : ''}`}
          >
            <div 
              className="news-image" 
              style={{ backgroundImage: `url(${article.image})` }}
              onClick={() => toggleArticle(article.id)}
            >
              <div className="news-source">{article.source}</div>
            </div>
            
            <div className="news-content">
              <h3 onClick={() => toggleArticle(article.id)}>
                {article.headline}
              </h3>
              
              <div className="news-meta">
                <span className="news-date">{formatDate(article.datetime)}</span>
                {article.related && (
                  <span className="news-related">{article.related}</span>
                )}
              </div>
              
              {expandedArticle === article.id && (
                <div className="news-details">
                  <p>{article.summary || 'No summary available.'}</p>
                  
                  {!summaries[article.id] ? (
                    <button 
                      className="summary-button"
                      onClick={() => fetchSummary(article.id, article.url)}
                      disabled={summaryLoading}
                    >
                      {summaryLoading ? 'Generating...' : 'Generate Summary'}
                    </button>
                  ) : (
                    <div className="article-summary">
                      <h4>AI Summary:</h4>
                      <p>{summaries[article.id]}</p>
                    </div>
                  )}
                  
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more"
                  >
                    Read full article
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;