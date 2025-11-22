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
  IconButton,
  TextField,
  Alert
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Logout as LogoutIcon } from '@mui/icons-material';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Dashboard() {
  const [pods, setPods] = useState([]);
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState('nginx');
  const [customImage, setCustomImage] = useState('');
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
        { 
          service_type: serviceType,
          custom_image: serviceType === 'custom' ? customImage : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOpen(false);
      fetchPods();
    } catch (error) {
      console.error(error);
      alert(`Failed to create pod: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDeleteCompany = async () => {
    if (!window.confirm("ARE YOU SURE? This will delete your company, all services, and your account permanently!")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/company`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      handleLogout();
    } catch (error) {
      alert(`Failed to delete company: ${error.response?.data?.detail || error.message}`);
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
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'primary.main' }}>
            {company}
          </Typography>
          <Chip 
            label={`Total Cost: €${calculateTotalCost()} / mo`} 
            variant="outlined" 
            sx={{ mr: 3, borderColor: 'rgba(255,255,255,0.2)', color: 'text.primary' }} 
          />
          <IconButton color="inherit" onClick={fetchPods} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Logout
          </Button>
          <Button color="error" onClick={handleDeleteCompany} sx={{ ml: 2 }}>
            Delete Company
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 6, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1" color="textPrimary" fontWeight="600">
            Services
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)}
            size="large"
          >
            New Service
          </Button>
        </Box>

        <Grid container spacing={3}>
          {pods.map((pod) => (
            <Grid item xs={12} sm={6} md={4} key={pod.name}>
              <Card elevation={0} sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="div" fontWeight="bold" color="text.primary">
                      {pod.type.toUpperCase()}
                    </Typography>
                    <Chip 
                      label={pod.status} 
                      color={pod.status.includes('Ready') ? 'success' : 'warning'} 
                      size="small" 
                      variant="filled"
                    />
                  </Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontFamily: 'monospace' }}>
                    {pod.name}
                  </Typography>
                  <Box mt={3}>
                    <Typography variant="body2" color="text.secondary">
                      Age: {pod.age}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Node: {pod.node_name || 'Pending'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      IP: {pod.pod_ip || 'Pending'}
                    </Typography>
                    {pod.external_url && (
                      <Box mt={1}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          href={pod.external_url} 
                          target="_blank"
                          fullWidth
                          sx={{ textTransform: 'none' }}
                        >
                          Open Service ↗
                        </Button>
                      </Box>
                    )}
                    {pod.message && (
                      <Alert severity={pod.message.includes('Healthy') ? 'success' : 'error'} sx={{ mt: 1, py: 0.5, fontSize: '0.8rem' }}>
                        {pod.message.length > 50 ? pod.message.substring(0, 50) + '...' : pod.message}
                      </Alert>
                    )}
                    <Typography variant="body1" color="primary.main" fontWeight="bold" mt={1}>
                      €{pod.cost.toFixed(2)} / mo
                    </Typography>
                  </Box>
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
          <Box textAlign="center" mt={10} p={5} sx={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 4 }}>
            <Typography variant="h6" color="textSecondary">
              No services running yet.
            </Typography>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setOpen(true)}>
              Deploy your first service
            </Button>
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
              <MenuItem value="custom">Custom Docker Image (€20.00/mo)</MenuItem>
            </Select>
          </FormControl>

          {serviceType === 'custom' && (
            <TextField
              fullWidth
              margin="dense"
              label="Docker Image Name"
              placeholder="e.g. nginx:latest or myrepo/app:v1"
              value={customImage}
              onChange={(e) => setCustomImage(e.target.value)}
              helperText="Ensure the cluster can pull this image."
            />
          )}
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
