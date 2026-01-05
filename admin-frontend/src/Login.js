import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container, 
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await axios.post(`${BACKEND_URL}/token`, formData);
      
      if (!response.data.is_admin) {
        setError('Access denied. Administrator privileges required.');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('admin_token', response.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0f172a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background pattern */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      
      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            borderRadius: 2, 
            bgcolor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box 
              sx={{ 
                width: 52, 
                height: 52, 
                borderRadius: 1.5, 
                bgcolor: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <AdminIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#f1f5f9', mb: 0.5 }}>
              Admin Portal
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Sign in to manage the platform
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: 1.5,
                bgcolor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '& .MuiAlert-icon': { color: '#ef4444' }
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#64748b', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#64748b', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ color: '#64748b' }}
                    >
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button 
              fullWidth 
              type="submit" 
              variant="contained" 
              size="large"
              disabled={loading || !username || !password}
              sx={{ 
                py: 1.5,
                bgcolor: '#f59e0b',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#d97706' },
                '&:disabled': { bgcolor: 'rgba(245, 158, 11, 0.3)', color: 'rgba(255,255,255,0.5)' }
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </form>
        </Paper>
        
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: '#475569' }}>
          Shield SaaS Platform • Admin Access
        </Typography>
      </Container>
    </Box>
  );
}

export default Login;
