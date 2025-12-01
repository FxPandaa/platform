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
  Fade,
  CircularProgress
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      
      // Check if user is admin
      if (!response.data.is_admin) {
        setError('This portal is for administrators only.');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('admin_token', response.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
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
        bgcolor: 'background.default',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 50%, #020617 100%)',
      }}
    >
      <Container maxWidth="xs">
        <Fade in timeout={800}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 5, 
              borderRadius: 4, 
              bgcolor: 'rgba(30, 41, 59, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(245, 158, 11, 0.1)'
            }}
          >
            {/* Logo Area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Box 
                sx={{ 
                  width: 70, 
                  height: 70, 
                  borderRadius: '20px', 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 10px 40px rgba(245, 158, 11, 0.4)'
                }}
              >
                <AdminPanelSettingsIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography 
                variant="h5" 
                align="center" 
                sx={{ 
                  fontWeight: 700, 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Admin Portal
              </Typography>
              <Typography variant="body2" align="center" sx={{ color: 'text.secondary', mt: 1 }}>
                Platform Administration
              </Typography>
            </Box>

            {error && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
              </Fade>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Admin Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                sx={{ mb: 2.5 }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                sx={{ mb: 3.5 }}
              />
              
              <Button 
                fullWidth 
                type="submit" 
                variant="contained" 
                size="large"
                disabled={loading}
                sx={{ 
                  py: 1.8,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  position: 'relative'
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Paper>
        </Fade>
        
        {/* Footer */}
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            textAlign: 'center', 
            mt: 4, 
            color: 'text.secondary',
            opacity: 0.6
          }}
        >
          Shield SaaS - Platform Administration
        </Typography>
      </Container>
    </Box>
  );
}

export default Login;
