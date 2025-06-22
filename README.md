# 📈 Stock Sentinel

**AI-Powered Market Analyst in Your Pocket**

Stock Sentinel is a lightweight, open-source platform designed to bring AI-driven market insights to retail investors. By blending technical indicators, sentiment analysis, and real-time financial data, it empowers users to make more informed investment decisions.

---

## 🚀 Features

- **🔮 AI Predictions**  
  24-hour stock price movement forecasts using a combination of sentiment analysis (news + social media) and technical indicators.

- **🔔 Smart Alerts**  
  Custom triggers for breakout patterns, unusual volume, or sentiment shifts.

- **📊 Portfolio Analytics**  
  Tracks profit/loss, holdings distribution, and risk metrics using charts and dashboards.

- **📈 Technical & Sentiment Indicators**  
  - RSI (14-day)
  - Price trend analysis
  - Fear & Greed Index
  - AI-generated summaries and chart insights

- **📰 Market News Feed**  
  Real-time financial headlines directly relevant to your watchlist.

---

## 💻 Tech Stack

- **Frontend**: React.js, Chart.js, TradingView widgets  
- **Backend**: Node.js, Express.js  
- **Database**: MongoDB  
- **APIs Used**:  
  - [Finnhub](https://finnhub.io/) – stock data & indicators  
  - [Alpha Vantage](https://www.alphavantage.co/) – technical indicators  
  - [NewsAPI](https://newsapi.org/) – sentiment & financial news  

- **Authentication**: JWT  
- **Hosting**: Vercel (Frontend) + Render / Railway (Backend)

---

## 🧠 Why I Built This

Most investment platforms are either locked behind a paywall or overloaded with complexity. I built Stock Sentinel to explore how **AI can assist—rather than replace—human decision-making** in financial markets. It bridges the gap between accessibility and insight by using:

- Real-time data feeds  
- Sentiment analysis from news/social media  
- Predictive modeling and visualizations  

---

## 📚 What I Learned

- Managing asynchronous data in React for live updates  
- Parsing financial data from multiple APIs  
- Integrating financial tools (Chart.js, TradingView)  
- Maintaining performance while using free-tier APIs  

---

---

## 📦 Setup Instructions

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/stock-sentinel.git
   cd stock-sentinel
