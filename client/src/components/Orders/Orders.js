import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Orders = () => {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
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
          const sortedOrders = response.data.user.orders 
            ? [...response.data.user.orders].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            : [];
          setOrders(sortedOrders);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again.');
        if (user?.orders) {
          setOrders([...user.orders].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, isAuthenticated]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="orders">
      <h2>Your Orders</h2>
      {orders && orders.length > 0 ? (
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Instrument</th>
                <th>Product</th>
                <th>Qty.</th>
                <th>Avg. Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={index}>
                  <td>{formatDate(order.timestamp)}</td>
                  <td className={`order-type ${order.type.toLowerCase()}`}>
                    {order.type}
                  </td>
                  <td>{order.symbol || 'N/A'}</td>
                  <td>{order.product || 'CNC'}</td>
                  <td>{order.quantity || 0}</td>
                  <td>₹{(order.price || 0).toFixed(2)}</td>
                  <td>{order.status || 'COMPLETED'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-orders">You don't have any orders yet.</p>
      )}
    </div>
  );
};

export default Orders;