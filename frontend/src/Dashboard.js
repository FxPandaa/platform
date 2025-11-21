import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Logout as LogoutIcon } from '@mui/icons-material';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Dashboard() {
  const [pods, setPods] = useState([]);
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState('nginx');
  const navigate = useNavigate();
  const company = localStorage.getItem('company');

  const fetchPods = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/my-deployments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPods(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    fetchPods();
    const interval = setInterval(fetchPods, 5000); // Auto refresh
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('company');
    navigate('/');
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BACKEND_URL}/pods`, 
        { service_type: serviceType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOpen(false);
      fetchPods();
    } catch (error) {
      alert('Failed to create pod');
    }
  };

  const handleDelete = async (podName) => {
    if (!window.confirm(`Are you sure you want to delete ${podName}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/pods/${podName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPods();
    } catch (error) {
      alert('Failed to delete pod');
    }
  };

  const calculateTotalCost = () => {
    return pods.reduce((acc, pod) => acc + pod.cost, 0).toFixed(2);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static" sx={{ background: '#1e3c72' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            {company} Dashboard
          </Typography>
          <Typography variant="subtitle1" sx={{ mr: 3 }}>
            Total Cost: €{calculateTotalCost()} / mo
          </Typography>
          <IconButton color="inherit" onClick={fetchPods} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" color="textPrimary" fontWeight="500">
            My Services
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)}
            sx={{ bgcolor: '#2a5298', '&:hover': { bgcolor: '#1e3c72' } }}
          >
            New Service
          </Button>
        </Box>

        <Grid container spacing={3}>
          {pods.map((pod) => (
            <Grid item xs={12} sm={6} md={4} key={pod.name}>
              <Card elevation={3} sx={{ borderRadius: 2, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" component="div" fontWeight="bold">
                      {pod.type.toUpperCase()}
                    </Typography>
                    <Chip 
                      label={pod.status} 
                      color={pod.status.includes('Ready') ? 'success' : 'warning'} 
                      size="small" 
                    />
                  </Box>
                  <Typography color="textSecondary" gutterBottom>
                    {pod.name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    <strong>Age:</strong> {pod.age}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Cost:</strong> €{pod.cost.toFixed(2)} / mo
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button 
                    size="small" 
                    color="error" 
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(pod.name)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {pods.length === 0 && (
          <Box textAlign="center" mt={10}>
            <Typography variant="h6" color="textSecondary">
              No services running. Click "New Service" to get started.
            </Typography>
          </Box>
        )}
      </Container>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Deploy New Service</DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 2 }}>
          <FormControl fullWidth margin="dense">
            <InputLabel>Service Type</InputLabel>
            <Select
              value={serviceType}
              label="Service Type"
              onChange={(e) => setServiceType(e.target.value)}
            >
              <MenuItem value="nginx">Nginx Web Server (€5.00/mo)</MenuItem>
              <MenuItem value="postgres">PostgreSQL Database (€15.00/mo)</MenuItem>
              <MenuItem value="redis">Redis Cache (€10.00/mo)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Deploy</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
