import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container, 
  Alert 
} from '@mui/material';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegistering) {
        await axios.post(`${BACKEND_URL}/register`, {
          username,
          password,
          company_name: companyName
        });
        setIsRegistering(false);
        setError('Account created! Please login.');
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
      }}
    >
      <Container maxWidth="xs">
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            borderRadius: 3, 
            bgcolor: 'background.paper',
            border: '1px solid rgba(255, 255, 255, 0.1)' 
          }}
        >
          <Typography variant="h4" align="center" gutterBottom sx={{ color: 'primary.main' }}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 4 }}>
            Self-Service Kubernetes Platform
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            {isRegistering && (
              <TextField
                fullWidth
                label="Company Name"
                variant="outlined"
                margin="normal"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
            )}
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            
            <Button 
              fullWidth 
              type="submit" 
              variant="contained" 
              size="large"
              sx={{ py: 1.5 }}
            >
              {isRegistering ? 'Register' : 'Login'}
            </Button>
          </form>

          <Button 
            fullWidth 
            sx={{ mt: 2, color: 'text.secondary' }}
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;
