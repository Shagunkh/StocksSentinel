import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Watchlist from './components/Watchlist/Watchlist';
import Dashboard from './components/Dashboard/Dashboard';
import Holdings from './components/Holdings/Holdings';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import PrivateRoute from './components/Watchlist/PrivateRoute';
import './App.css';
import Orders from './components/Orders/Orders';
import Positions from './components/Positions/Positions';
import Funds from './components/Funds/Funds';
import AISummary from './components/AISummary/AISummary';
import AIPrediction from './components/AIPrediction/AIPrediction';
import Profile from './components/Profile/Profile';




function App() {
  const [chartData, setChartData] = useState(null);
  const [chartSymbol, setChartSymbol] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);

  const handleShowChart = (data, symbol) => {
    setChartData(data);
    setChartSymbol(symbol);
    setShowChart(true);
  };

  const handleCloseChart = () => {
    setShowChart(false);
    setChartData(null);
    setChartSymbol('');
  };
  const handleWatchlistUpdate = (symbols) => {
    setWatchlistSymbols(symbols);
  };

  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <div className="main-content">
          <div className="left-section">
            <Watchlist onShowChart={handleShowChart} onWatchlistUpdate={handleWatchlistUpdate} />
          </div>
          <div className="right-section">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Signup />} />
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard 
                      chartData={chartData} 
                      chartSymbol={chartSymbol} 
                      showChart={showChart} 
                      onCloseChart={handleCloseChart} 
                      watchlistSymbols={watchlistSymbols}
                    />
                  </PrivateRoute>
                } 
              />
              
              <Route path="/holdings" element={<PrivateRoute><Holdings /></PrivateRoute>} />
             <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
              <Route path="/positions" element={<PrivateRoute><Positions /></PrivateRoute>} />
              <Route path="/funds" element={<PrivateRoute><Funds /></PrivateRoute>} />
             <Route path="/profile" element={<Profile />} />
<Route path="/ai-summary/:symbol" element={<AISummary />} />

<Route path="/ai-predict/:symbol" element={<AIPrediction />} />
              <Route path="/app" element={<PrivateRoute><div>App Settings</div></PrivateRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;