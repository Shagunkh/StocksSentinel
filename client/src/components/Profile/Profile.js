import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [portfolioData, setPortfolioData] = useState({
    walletBalance: 0,
    positions: [],
    transactions: []
  });

  useEffect(() => {
    // Fetch user portfolio data when component mounts
    const fetchPortfolioData = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setPortfolioData({
            walletBalance: data.user.walletBalance || 0,
            positions: data.user.positions || [],
            transactions: data.user.transactions || []
          });
        }
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
      }
    };

    if (user) {
      fetchPortfolioData();
    }
  }, [user]);

  return (
    <div className="profile-container">
      <h1>Profile</h1>
      
      <div className="profile-info">
        <h2>Personal Information</h2>
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Wallet Balance:</strong> ₹{portfolioData.walletBalance.toFixed(2)}</p>
      </div>

      <div className="portfolio-section">
        <h2>Positions</h2>
        {portfolioData.positions.length > 0 ? (
          <table className="positions-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Avg. Price</th>
                <th>LTP</th>
                <th>P&L</th>
              </tr>
            </thead>
            <tbody>
              {portfolioData.positions.map((position, index) => (
                <tr key={index}>
                  <td>{position.symbol}</td>
                  <td>{position.quantity}</td>
                  <td>₹{position.avgPrice?.toFixed(2)}</td>
                  <td>₹{position.ltp?.toFixed(2)}</td>
                  <td className={position.pnl >= 0 ? 'profit' : 'loss'}>
                    ₹{position.pnl?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No positions found</p>
        )}
      </div>

      <div className="transactions-section">
        <h2>Transactions</h2>
        {portfolioData.transactions.length > 0 ? (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Bank</th>
              </tr>
            </thead>
            <tbody>
              {portfolioData.transactions.map((transaction, index) => (
                <tr key={index}>
                  <td>{new Date(transaction.date).toLocaleDateString()}</td>
                  <td>{transaction.type}</td>
                  <td>₹{transaction.amount?.toFixed(2)}</td>
                  <td>{transaction.bankName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No transactions found</p>
        )}
      </div>
    </div>
  );
};

export default Profile;