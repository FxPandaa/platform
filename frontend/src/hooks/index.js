/**
 * Custom Hooks for the Self-Service Platform
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { POLLING_INTERVAL, useThemeContext } from '../theme';

// Re-export useThemeContext for convenience
export { useThemeContext };

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

// ============================================
// usePolling - Poll data at regular intervals
// ============================================

/**
 * Poll an API endpoint at regular intervals
 * @param {Function} fetchFn - The fetch function to call
 * @param {number} interval - Polling interval in ms
 * @param {Object} options - Options: enabled (boolean), skipInitial (boolean)
 */
export function usePolling(fetchFn, interval = POLLING_INTERVAL, options = {}) {
  const { enabled = true, skipInitial = false } = options;
  const savedCallback = useRef(fetchFn);
  
  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = fetchFn;
  }, [fetchFn]);
  
  useEffect(() => {
    if (!enabled) return;
    
    // Create AbortController for cleanup
    const controller = new AbortController();
    
    // Optionally skip initial call (useful when parent component handles initial fetch)
    if (!skipInitial) {
      savedCallback.current({ signal: controller.signal });
    }
    
    // Set up the interval
    const timer = setInterval(() => {
      savedCallback.current({ signal: controller.signal });
    }, interval);
    
    // Cleanup on unmount
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [interval, enabled, skipInitial]);
}

// ============================================
// useAuth - Authentication hook
// ============================================

/**
 * Authentication hook for managing user session
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const company = localStorage.getItem('company');
    if (token && company) {
      setIsAuthenticated(true);
      setUser({ company });
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${BACKEND_URL}/token`, formData);
    const { access_token, company, is_admin } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('company', company);
    
    setIsAuthenticated(true);
    setUser({ company, isAdmin: is_admin });
    
    return { company, isAdmin: is_admin };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('company');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const getToken = useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  const getCompany = useCallback(() => {
    return localStorage.getItem('company');
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    getToken,
    getCompany,
  };
}

// ============================================
// useApi - API request hook with auth
// ============================================

/**
 * Make authenticated API requests
 */
export function useApi() {
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  }, []);

  const get = useCallback(async (endpoint) => {
    const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }, [getAuthHeaders]);

  const post = useCallback(async (endpoint, data = {}) => {
    const response = await axios.post(`${BACKEND_URL}${endpoint}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }, [getAuthHeaders]);

  const del = useCallback(async (endpoint) => {
    const response = await axios.delete(`${BACKEND_URL}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  }, [getAuthHeaders]);

  return { get, post, del, getAuthHeaders };
}

// ============================================
// usePodActions - Pod management actions
// ============================================

/**
 * Pod management actions hook
 */
export function usePodActions(onSuccess, onError) {
  const { get, post, del } = useApi();

  const deletePod = useCallback(async (podName) => {
    try {
      await del(`/pods/${podName}`);
      onSuccess?.('Pod deleted successfully');
    } catch (error) {
      onError?.(error.response?.data?.detail || 'Failed to delete pod');
      throw error;
    }
  }, [del, onSuccess, onError]);

  const viewLogs = useCallback(async (podName) => {
    try {
      const logs = await get(`/pods/${podName}/logs`);
      return logs;
    } catch (error) {
      onError?.(error.response?.data?.detail || 'Failed to fetch logs');
      throw error;
    }
  }, [get, onError]);

  const viewMetrics = useCallback(async (podName) => {
    try {
      const metrics = await get(`/pods/${podName}/metrics`);
      return metrics;
    } catch (error) {
      onError?.(error.response?.data?.detail || 'Failed to fetch metrics');
      throw error;
    }
  }, [get, onError]);

  const createPod = useCallback(async (serviceType, customImage = null) => {
    try {
      await post('/pods', {
        service_type: serviceType,
        custom_image: serviceType === 'custom' ? customImage : null,
      });
      onSuccess?.('Pod created successfully');
    } catch (error) {
      onError?.(error.response?.data?.detail || 'Failed to create pod');
      throw error;
    }
  }, [post, onSuccess, onError]);

  return {
    deletePod,
    viewLogs,
    viewMetrics,
    createPod,
  };
}

// ============================================
// useNotification - Snackbar notifications
// ============================================

/**
 * Notification management hook
 */
export function useNotification() {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
    title: '',
  });

  const showNotification = useCallback((title, message, severity = 'success') => {
    setNotification({ open: true, message, severity, title });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const showSuccess = useCallback((title, message) => {
    showNotification(title, message, 'success');
  }, [showNotification]);

  const showError = useCallback((title, message) => {
    showNotification(title, message, 'error');
  }, [showNotification]);

  const showWarning = useCallback((title, message) => {
    showNotification(title, message, 'warning');
  }, [showNotification]);

  const showInfo = useCallback((title, message) => {
    showNotification(title, message, 'info');
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

// ============================================
// useDebounce - Debounced value
// ============================================

/**
 * Debounce a value
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in ms
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// useLocalStorage - Persistent state
// ============================================

/**
 * State that persists to localStorage
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
