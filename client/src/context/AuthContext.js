// import React, { createContext, useState, useEffect } from 'react';
// import authService from '../api/auth';

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const checkAuth = async () => {
//       try {
//         const user = JSON.parse(localStorage.getItem('user'));
//         if (user && user.token) {
//           setUser(user);
//           setIsAuthenticated(true);
//         }
//       } catch (error) {
//         console.error('Auth check error:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     checkAuth();
//   }, []);

//   const register = async (userData) => {
//   try {
//     const data = await authService.register(userData);
//     if (data.token) {
//       setUser(data.user);
//       setIsAuthenticated(true);
//       localStorage.setItem('user', JSON.stringify(data));
//       return { success: true };
//     }
//     return { success: false, message: 'Registration failed' };
//   } catch (error) {
//     return { success: false, message: error.message || 'Registration failed' };
//   }
// };

//   const login = async (userData) => {
//     try {
//       const data = await authService.login(userData);
//       setUser(data);
//       setIsAuthenticated(true);
//       return { success: true };
//     } catch (error) {
//       return { success: false, message: error.response?.data?.message || 'Login failed' };
//     }
//   };

//   const logout = () => {
//     authService.logout();
//     setUser(null);
//     setIsAuthenticated(false);
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         isAuthenticated,
//         isLoading,
//         register,
//         login,
//         logout,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => React.useContext(AuthContext);

// client/src/context/AuthContext.js
// client/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import authService from '../api/auth';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          setIsLoading(false);
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser?.token || !parsedUser?.user) {
          localStorage.removeItem('user');
          setIsLoading(false);
          return;
        }

        // Verify token structure
        const tokenParts = parsedUser.token.split('.');
        if (tokenParts.length !== 3) {
          localStorage.removeItem('user');
          setIsLoading(false);
          return;
        }

        try {
          const response = await axios.get('/api/auth/user', {
            headers: { Authorization: `Bearer ${parsedUser.token}` }
          });

          if (response.data?.success) {
            setUser(response.data.user);
            setIsAuthenticated(true);
            // Update storage with fresh data
            localStorage.setItem('user', JSON.stringify({
              token: parsedUser.token,
              user: response.data.user
            }));
          } else {
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('User validation failed:', error);
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Auth init error:', error);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      if (data.token && data.user) {
        localStorage.setItem('user', JSON.stringify({
          token: data.token,
          user: data.user
        }));
        setUser(data.user);
        setIsAuthenticated(true);
        return { success: true, user: data.user };
      }
      return { success: false, message: 'Registration failed' };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Registration failed' 
      };
    }
  };

const login = async (userData) => {
  try {
    const data = await authService.login(userData);
    if (data.token && data.user) {
      localStorage.setItem('user', JSON.stringify({
        token: data.token,
        user: data.user
      }));
      setUser(data.user);
      setIsAuthenticated(true);
      return { success: true, user: data.user };
    }
    return { success: false, message: 'Login failed' };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Login failed' 
    };
  }
};

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateWalletBalance = (newBalance) => {
    setUser(prev => {
      if (!prev) return prev;
      
      const updatedUser = { ...prev, walletBalance: newBalance };
      const storedUser = localStorage.getItem('user');
      
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          localStorage.setItem('user', JSON.stringify({
            token: parsed.token,
            user: updatedUser
          }));
        } catch (err) {
          console.error('Failed to update localStorage:', err);
        }
      }
      
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        register,
        login,
        logout,
        updateWalletBalance
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);