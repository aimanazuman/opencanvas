import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi, boardsApi } from '../services/api';
import { getGuestBoards, clearGuestBoards } from '../utils/guestStorage';
import { sanitizeFormData } from '../utils/sanitize';

const AuthContext = createContext(null);

// Set to true to bypass backend and use localStorage mock data
const DEMO_MODE = false;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    if (DEMO_MODE) {
      const storedUser = localStorage.getItem('demo_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to parse stored user:', error);
        }
      }
      setLoading(false);
    } else {
      const token = localStorage.getItem('access_token');
      if (token) {
        loadUser();
      } else {
        setLoading(false);
      }
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await authApi.getProfile();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load user:', error);
      // Token might be expired, clear it
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    if (DEMO_MODE) {
      // Demo mode: accept any credentials
      const demoUser = {
        id: 1,
        username: username,
        email: `${username}@uptm.edu.my`,
        first_name: username.charAt(0).toUpperCase() + username.slice(1),
        last_name: 'Demo',
        role: username === 'admin' ? 'admin' : username === 'lecturer' ? 'lecturer' : 'student',
        avatar: null,
        student_id: username === 'student' || username === 'testuser' ? 'STU2024001' : null,
        staff_id: username === 'lecturer' || username === 'admin' ? 'STF2024001' : null,
      };

      // Store in localStorage for demo persistence
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      localStorage.setItem('access_token', 'demo_token');

      setUser(demoUser);
      setIsAuthenticated(true);

      return { success: true, user: demoUser };
    }

    try {
      const response = await authApi.login({ username, password });
      const { user: userData, tokens } = response.data;

      // Store tokens
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);

      // Set user data
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      // Handle email verification required
      if (error.response?.status === 403 && error.response?.data?.requires_verification) {
        return {
          success: false,
          requires_verification: true,
          email: error.response.data.email,
          error: error.response.data.message
        };
      }
      return {
        success: false,
        error: error.response?.data?.non_field_errors?.[0] || error.response?.data?.detail || error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    if (DEMO_MODE) {
      // Demo mode: accept any registration
      const demoUser = {
        id: Math.floor(Math.random() * 1000) + 1,
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role || 'student',
        avatar: null,
        student_id: userData.role === 'student' ? `STU${Math.floor(Math.random() * 1000000)}` : null,
        staff_id: userData.role !== 'student' ? `STF${Math.floor(Math.random() * 1000000)}` : null,
      };

      // Store in localStorage for demo persistence
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      localStorage.setItem('access_token', 'demo_token');

      setUser(demoUser);
      setIsAuthenticated(true);

      return { success: true, user: demoUser };
    }

    try {
      const response = await authApi.register(sanitizeFormData(userData));
      const { user: newUser, tokens, requires_verification } = response.data;

      if (requires_verification) {
        // Account created but needs email verification — don't log in
        return { success: true, requires_verification: true, user: newUser };
      }

      // Store tokens
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);

      // Set user data
      setUser(newUser);
      setIsAuthenticated(true);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration failed:', error);
      const errors = error.response?.data || {};
      return {
        success: false,
        errors
      };
    }
  };

  const logout = async () => {
    if (DEMO_MODE) {
      // Demo mode: just clear local storage
      localStorage.removeItem('demo_user');
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authApi.logout({ refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user data regardless
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const loginAsGuest = async () => {
    try {
      const response = await authApi.guestLogin();
      const { user: userData, tokens } = response.data;

      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Guest login failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Guest login failed'
      };
    }
  };

  const convertGuest = async (data) => {
    try {
      const response = await authApi.convertGuest(sanitizeFormData(data));
      const { user: userData, tokens } = response.data;

      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);

      setUser(userData);

      // Migrate guest boards from localStorage to server
      const guestBoards = getGuestBoards();
      for (const board of guestBoards) {
        try {
          await boardsApi.create({
            name: board.name,
            board_type: board.type || 'course-material',
            content: board,
          });
        } catch (err) {
          console.error('Failed to migrate guest board:', board.name, err);
        }
      }
      clearGuestBoards();

      return { success: true, user: userData };
    } catch (error) {
      console.error('Guest conversion failed:', error);
      return {
        success: false,
        errors: error.response?.data || {}
      };
    }
  };

  const isGuest = user?.is_guest === true;

  const updateProfile = async (profileData) => {
    if (DEMO_MODE) {
      // Demo mode: update local user data
      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('demo_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    }

    try {
      const response = await authApi.updateProfile(sanitizeFormData(profileData));
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        error: error.response?.data || 'Profile update failed'
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isGuest,
    login,
    loginAsGuest,
    register,
    logout,
    convertGuest,
    updateProfile,
    refreshUser: loadUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
