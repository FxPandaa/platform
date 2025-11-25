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
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
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
        setSuccess('Account created successfully! Please login.');
        setUsername('');
        setPassword('');
        setCompanyName('');
      } else {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await axios.post(`${BACKEND_URL}/token`, formData);
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('company', response.data.company);
        navigate('/dashboard');
      }
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
              border: '1px solid rgba(99, 102, 241, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(99, 102, 241, 0.1)'
            }}
          >
            {/* Logo Area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Box 
                sx={{ 
                  width: 70, 
                  height: 70, 
                  borderRadius: '20px', 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)'
                }}
              >
                <CloudQueueIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography 
                variant="h5" 
                align="center" 
                sx={{ 
                  fontWeight: 700, 
                  background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {isRegistering ? 'Create Account' : 'Welcome Back'}
              </Typography>
              <Typography variant="body2" align="center" sx={{ color: 'text.secondary', mt: 1 }}>
                Self-Service Kubernetes Platform
              </Typography>
            </Box>

            {error && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
              </Fade>
            )}
            
            {success && (
              <Fade in>
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>
              </Fade>
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
                sx={{ mb: 2.5 }}
              />
              {isRegistering && (
                <Fade in={isRegistering}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    variant="outlined"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={loading}
                    sx={{ mb: 2.5 }}
                  />
                </Fade>
              )}
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
                  isRegistering ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
              </Typography>
              <Button 
                sx={{ 
                  mt: 0.5, 
                  color: 'primary.main',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(99, 102, 241, 0.1)'
                  }
                }}
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setSuccess('');
                }}
                disabled={loading}
              >
                {isRegistering ? 'Sign In' : 'Create Account'}
              </Button>
            </Box>
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
          Enterprise Kubernetes Management Platform
        </Typography>
      </Container>
    </Box>
  );
}

export default Login;
