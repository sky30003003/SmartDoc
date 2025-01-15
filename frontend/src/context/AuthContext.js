import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [organizationName, setOrganizationName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (newToken, userData) => {
    try {
      console.log('AuthContext: Setting token and user data');
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setCurrentUser(() => userData);
      setOrganizationName(userData.organizationName);
      console.log('AuthContext: Current user updated');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setOrganizationName(null);
  };

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
          setLoading(false);
          return;
        }

        setToken(storedToken);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Token invalid');
        }

        const data = await response.json();
        setCurrentUser(() => data.user);
        setOrganizationName(data.user.organizationName);
      } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
        setOrganizationName(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  useEffect(() => {
    console.log('AuthContext: Current user changed:', currentUser);
  }, [currentUser]);

  const value = {
    currentUser,
    login,
    logout,
    loading,
    organizationName,
    token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 