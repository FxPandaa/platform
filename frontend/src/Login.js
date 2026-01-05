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
  Collapse,
  Divider,
} from '@mui/material';
import {
  CloudQueue as CloudIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegistering) {
        await axios.post(`${BACKEND_URL}/register`, {
          username,
          password,
          company_name: companyName
        });
        setIsRegistering(false);
        setSuccess('Account created! You can now sign in.');
        setUsername('');
        setPassword('');
        setCompanyName('');
      } else {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await axios.post(`${BACKEND_URL}/token`, formData);
        
        if (response.data.is_admin) {
          setError('Please use the Admin Portal for administrator access.');
          setLoading(false);
          return;
        }
        
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('company', response.data.company);
        navigate('/dashboard');
      }
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
      {/* Background */}
      <Box sx={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.06) 0%, transparent 50%)',
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
                bgcolor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <CloudIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#f1f5f9', mb: 0.5 }}>
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Kubernetes Self-Service Platform
            </Typography>
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2.5, borderRadius: 1.5, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', '& .MuiAlert-icon': { color: '#ef4444' } }}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success" 
              sx={{ mb: 2.5, borderRadius: 1.5, bgcolor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', '& .MuiAlert-icon': { color: '#22c55e' } }}
            >
              {success}
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
                startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment>
              }}
            />
            
            <Collapse in={isRegistering}>
              <TextField
                fullWidth
                label="Company Name"
                variant="outlined"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required={isRegistering}
                disabled={loading}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><BusinessIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment>
                }}
              />
            </Collapse>
            
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
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)} sx={{ color: '#64748b' }}>
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
              disabled={loading || !username || !password || (isRegistering && !companyName)}
              sx={{ 
                py: 1.5,
                bgcolor: '#6366f1',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#4f46e5' },
                '&:disabled': { bgcolor: 'rgba(99, 102, 241, 0.3)', color: 'rgba(255,255,255,0.5)' }
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : (isRegistering ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.06)' }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            </Typography>
            <Button 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
              disabled={loading}
              sx={{ color: '#6366f1', fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' } }}
            >
              {isRegistering ? 'Sign In' : 'Create Account'}
            </Button>
          </Box>
        </Paper>
        
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: '#475569' }}>
          Self Service Platform • Kubernetes
        </Typography>
      </Container>
    </Box>
  );
}

export default Login;
