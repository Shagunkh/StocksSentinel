import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../api/auth';

const Funds = () => {
  const { user, updateWalletBalance } = useAuth();
  const [action, setAction] = useState('ADD');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Fetch wallet balance when component mounts or user changes
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const response = await authService.getUser();
        setWalletBalance(response.user?.walletBalance || 0);
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      }
    };

    fetchWalletBalance();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await authService.updateFunds({
        action,
        amount: parseFloat(amount),
        bankName
      });

      if (response.success) {
        // Update both local state and context
        setWalletBalance(response.walletBalance);
        updateWalletBalance(response.walletBalance);
        
        setMessage({
          type: 'success',
          text: `Funds ${action === 'ADD' ? 'added to' : 'withdrawn from'} wallet successfully!`
        });
        setAmount('');
        setBankName('');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to process funds request'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="funds">
      <h2>Funds Management</h2>
      
      <div className="wallet-summary">
        <h3>Available Margin</h3>
        <p className="balance">₹{walletBalance.toFixed(2)}</p>
      </div>
      
      <div className="funds-form-container">
        <div className="action-tabs">
          <button 
            className={`tab ${action === 'ADD' ? 'active' : ''}`}
            onClick={() => setAction('ADD')}
          >
            Add Funds
          </button>
          <button 
            className={`tab ${action === 'WITHDRAW' ? 'active' : ''}`}
            onClick={() => setAction('WITHDRAW')}
          >
            Withdraw Funds
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="funds-form">
          <div className="form-group">
            <label>Amount (₹):</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Bank Name:</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : action === 'ADD' ? 'Add Funds' : 'Withdraw Funds'}
          </button>
        </form>
        
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default Funds;