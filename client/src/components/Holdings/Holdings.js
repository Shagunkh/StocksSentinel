import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';


const Holdings = () => {
  const { user, isAuthenticated } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHoldings = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const token = JSON.parse(localStorage.getItem('user'))?.token;
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success) {
          setHoldings(response.data.user.holdings || []);
        }
      } catch (err) {
        console.error('Error fetching holdings:', err);
        setError('Failed to load holdings. Please try again.');
        // Fallback to user.holdings if available
        if (user?.holdings) {
          setHoldings([...user.holdings]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHoldings();
  }, [user, isAuthenticated]);

  if (loading) {
    return <div className="loading">Loading holdings...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="holdings">
      <h2>Your Holdings</h2>
      {holdings && holdings.length > 0 ? (
        <div className="table-responsive">
          <table className="holdings-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Avg. Price</th>
                <th>Invested</th>
                <th>Product</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding, index) => {
                const investedAmount = (holding.quantity || 0) * (holding.avgPrice || 0);
                return (
                  <tr key={index}>
                    <td>{holding.symbol || 'N/A'}</td>
                    <td>{holding.quantity || 0}</td>
                    <td>₹{(holding.avgPrice || 0).toFixed(2)}</td>
                    <td>₹{investedAmount.toFixed(2)}</td>
                    <td>{holding.product || 'CNC'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-holdings">You don't have any holdings yet.</p>
      )}
    </div>
  );
};

export default Holdings;