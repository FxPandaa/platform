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
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Logout as LogoutIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function Dashboard() {
  const [pods, setPods] = useState([]);
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState('nginx');
  const [customImage, setCustomImage] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState('');
  const [logPodName, setLogPodName] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();
  const company = localStorage.getItem('company');

  const fetchPods = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/pods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPods(response.data);
    } catch (error) {
      console.error("Error fetching pods:", error);
      if (error.response && error.response.status === 401) {
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
      console.log("Sending pod create request:", { service_type: serviceType, custom_image: customImage });
      
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
      console.error("Create Pod Error:", error);
      let errorMsg = "Unknown error";
      
      if (error.response) {
        // Server reageerde met een status code buiten de 2xx range
        if (error.response.data && error.response.data.detail) {
           const detail = error.response.data.detail;
           // Als detail een object/array is (zoals bij validatie errors), maak er string van
           errorMsg = typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail;
        } else {
           errorMsg = `Status: ${error.response.status} - ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request is verstuurd maar geen response ontvangen
        errorMsg = "No response from server. Check if backend is running.";
      } else {
        // Iets anders ging mis
        errorMsg = error.message;
      }
      
      alert(`Failed to create pod:\n${errorMsg}`);
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

  const handleViewLogs = async (podName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/pods/${podName}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentLogs(response.data.logs);
      setLogPodName(podName);
      setLogsOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch logs");
    }
  };

  const calculateTotalCost = () => {
    return pods.reduce((total, pod) => total + (pod.cost || 0), 0).toFixed(2);
  };

  const getCategory = (type) => {
    if (!type) return 'other';
    const t = type.toLowerCase();
    if (t.startsWith('nginx') || t.startsWith('wordpress') || t.startsWith('custom')) return 'web';
    if (t.startsWith('postgres') || t.startsWith('mysql') || t.startsWith('redis')) return 'db';
    if (t.startsWith('uptime-kuma')) return 'monitor';
    return 'other';
  };

  const filteredPods = pods.filter(pod => {
    const cat = getCategory(pod.type);
    if (tabValue === 0) return true;
    if (tabValue === 1) return cat === 'web';
    if (tabValue === 2) return cat === 'db';
    if (tabValue === 3) return cat === 'monitor';
    return true;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
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

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="All Apps" />
          <Tab label="Web Services" />
          <Tab label="Databases" />
          <Tab label="Monitoring" />
        </Tabs>

        <Grid container spacing={3}>
          {filteredPods.map((pod) => (
            <Grid item xs={12} sm={6} md={4} key={pod.name}>
              <Card elevation={0} sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="div" fontWeight="bold" color="text.primary">
                      {pod.type.toUpperCase()}
                    </Typography>
                    <Chip 
                      label={pod.status} 
                      color={pod.status === 'Running' ? 'success' : 'warning'} 
                      size="small" 
                      variant="filled"
                    />
                  </Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontFamily: 'monospace' }}>
                    {pod.name}
                  </Typography>
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Age: {pod.age}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Node: {pod.node_name || 'Pending'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      IP: {pod.public_ip}
                    </Typography>
                    {pod.node_port && (
                       <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                         Port: {pod.node_port}
                       </Typography>
                    )}
                  </Box>

                  {pod.node_port && (
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      size="small"
                      href={`http://${pod.public_ip}:${pod.node_port}`}
                      target="_blank"
                      sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'primary.main' }}
                    >
                      Open Service ↗
                    </Button>
                  )}

                  <Button 
                      variant="outlined" 
                      fullWidth 
                      size="small"
                      onClick={() => handleViewLogs(pod.name)}
                      sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
                    >
                      View Logs
                  </Button>

                  {pod.message && (
                      <Alert severity={pod.message.includes('Healthy') ? 'success' : 'error'} sx={{ mt: 1, py: 0.5, fontSize: '0.8rem' }}>
                        {pod.message.length > 50 ? pod.message.substring(0, 50) + '...' : pod.message}
                      </Alert>
                    )}
                    <Typography variant="body1" color="primary.main" fontWeight="bold" mt={1}>
                      €{pod.cost.toFixed(2)} / mo
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Service Type</InputLabel>
            <Select
              value={serviceType}
              label="Service Type"
              onChange={(e) => setServiceType(e.target.value)}
            >
              <MenuItem value="nginx">Nginx Web Server</MenuItem>
              <MenuItem value="wordpress">WordPress (Website + DB)</MenuItem>
              <MenuItem value="uptime-kuma">Uptime Kuma (Monitoring)</MenuItem>
              <MenuItem value="postgres">PostgreSQL Database</MenuItem>
              <MenuItem value="redis">Redis Cache</MenuItem>
              <MenuItem value="custom">Custom Docker Image</MenuItem>
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
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreate} variant="contained">Deploy</Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onClose={() => setLogsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0a1929' } }}>
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Logs: {logPodName}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ 
            bgcolor: 'black', 
            p: 2, 
            borderRadius: 1, 
            fontFamily: 'monospace', 
            fontSize: '0.85rem', 
            color: '#00ff00',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}>
            {currentLogs || "No logs available..."}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
