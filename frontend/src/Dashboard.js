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
  Tab,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Logout as LogoutIcon, CheckCircle as CheckCircleIcon, Memory as MemoryIcon, Settings as SettingsIcon } from '@mui/icons-material';
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
  
  // Metrics state
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [metricsPodName, setMetricsPodName] = useState('');
  const [metricsLoading, setMetricsLoading] = useState(false);
  
  // Environment Variables state
  const [envOpen, setEnvOpen] = useState(false);
  const [currentEnvVars, setCurrentEnvVars] = useState({});
  const [envPodName, setEnvPodName] = useState('');
  const [envLoading, setEnvLoading] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [envDeploymentName, setEnvDeploymentName] = useState('');
  
  const navigate = useNavigate();
  const company = localStorage.getItem('company');

  const fetchPods = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/pods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Received pods from backend:", response.data);
      console.log("Total pods received:", response.data.length);
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
    const pod = pods.find(p => p.name === podName);
    if (pod && pod.status !== 'Running' && pod.status !== 'Succeeded') {
        alert(`Cannot fetch logs. Pod status is ${pod.status}. \nDetails: ${pod.message || 'Container is not running.'}`);
        return;
    }
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
      alert("Failed to fetch logs. The container might be starting or crashed.");
    }
  };

  // ==================== METRICS HANDLERS ====================
  const handleViewMetrics = async (podName) => {
    setMetricsPodName(podName);
    setMetricsLoading(true);
    setMetricsOpen(true);
    setCurrentMetrics(null);
    
    try {
      const token = localStorage.getItem('token');
      const encodedPodName = encodeURIComponent(podName);
      console.log(`Fetching metrics for: ${podName} (encoded: ${encodedPodName})`);
      console.log(`URL: ${BACKEND_URL}/pods/${encodedPodName}/metrics`);
      
      const response = await axios.get(`${BACKEND_URL}/pods/${encodedPodName}/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000  // 10 second timeout
      });
      console.log("Metrics response:", response.data);
      setCurrentMetrics(response.data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      let errorMsg = "Failed to fetch metrics";
      if (error.code === 'ERR_NETWORK') {
        errorMsg = "Network error - backend may be unavailable";
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.message) {
        errorMsg = error.message;
      }
      setCurrentMetrics({ error: errorMsg });
    } finally {
      setMetricsLoading(false);
    }
  };

  // Auto-refresh metrics when dialog is open
  useEffect(() => {
    if (metricsOpen && metricsPodName) {
      const interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const encodedPodName = encodeURIComponent(metricsPodName);
          const response = await axios.get(`${BACKEND_URL}/pods/${encodedPodName}/metrics`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
          setCurrentMetrics(response.data);
        } catch (error) {
          console.error("Error refreshing metrics:", error);
        }
      }, 5000);  // Increased to 5 seconds to reduce load
      return () => clearInterval(interval);
    }
  }, [metricsOpen, metricsPodName]);

  // ==================== ENVIRONMENT VARIABLES HANDLERS ====================
  const handleViewEnv = async (podName) => {
    setEnvPodName(podName);
    setEnvLoading(true);
    setEnvOpen(true);
    setCurrentEnvVars({});
    setNewEnvKey('');
    setNewEnvValue('');
    
    try {
      const token = localStorage.getItem('token');
      const encodedPodName = encodeURIComponent(podName);
      const response = await axios.get(`${BACKEND_URL}/pods/${encodedPodName}/env`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      setCurrentEnvVars(response.data.env_vars || {});
      setEnvDeploymentName(response.data.deployment_name || podName);
    } catch (error) {
      console.error("Error fetching env vars:", error);
      alert("Failed to fetch environment variables");
      setEnvOpen(false);
    } finally {
      setEnvLoading(false);
    }
  };

  const handleAddEnvVar = () => {
    if (newEnvKey && newEnvKey.trim()) {
      setCurrentEnvVars(prev => ({
        ...prev,
        [newEnvKey.trim()]: newEnvValue
      }));
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleRemoveEnvVar = (key) => {
    setCurrentEnvVars(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSaveEnvVars = async () => {
    try {
      const token = localStorage.getItem('token');
      const encodedPodName = encodeURIComponent(envPodName);
      await axios.put(`${BACKEND_URL}/pods/${encodedPodName}/env`, 
        { env_vars: currentEnvVars },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Environment variables updated. The pod will restart with new values.");
      setEnvOpen(false);
      fetchPods();
    } catch (error) {
      console.error("Error saving env vars:", error);
      alert(`Failed to save environment variables: ${error.response?.data?.detail || error.message}`);
    }
  };

  const calculateTotalCost = () => {
    return pods.reduce((total, pod) => total + (pod.cost || 0), 0).toFixed(2);
  };

  const getCategory = (type) => {
    if (!type) return 'other';
    const t = type.toLowerCase();
    if (t.startsWith('wordpress')) return 'app';
    if (t.startsWith('nginx') || t.startsWith('custom')) return 'single';
    if (t.startsWith('postgres') || t.startsWith('mysql') || t.startsWith('redis')) return 'db';
    if (t.startsWith('uptime-kuma')) return 'monitor';
    return 'other';
  };

  // Debugging: Log all pods before filtering
  useEffect(() => {
    console.log("Current pods in state:", pods);
  }, [pods]);

  const filteredPods = pods.filter(pod => {
    const cat = getCategory(pod.type);
    if (tabValue === 0) return true;
    if (tabValue === 1) return cat === 'app';
    if (tabValue === 2) return cat === 'single';
    if (tabValue === 3) return cat === 'db';
    if (tabValue === 4) return cat === 'monitor';
    return true;
  });
  
  console.log("Total pods:", pods.length);
  console.log("Filtered pods (tab " + tabValue + "):", filteredPods.length);
  console.log("Pod types:", pods.map(p => p.type));

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
          <Tab label="All Services" />
          <Tab label="Bundles (WP)" />
          <Tab label="Single Services" />
          <Tab label="Databases" />
          <Tab label="Monitoring" />
        </Tabs>

        <Grid container spacing={3}>
          {filteredPods.map((pod) => {
            const linkedPods = pod.group_id 
              ? pods.filter(p => p.group_id === pod.group_id && p.name !== pod.name)
              : [];

            return (
            <Grid item xs={12} sm={6} md={4} key={pod.name}>
              <Card elevation={0} sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="div" fontWeight="bold" color="text.primary">
                      {pod.type.toUpperCase()}
                    </Typography>
                    <Chip 
                      label={pod.status} 
                      color={pod.status === 'Running' ? 'success' : (pod.status === 'Pending' ? 'warning' : 'error')} 
                      size="small" 
                      variant="filled"
                    />
                  </Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontFamily: 'monospace' }}>
                    {pod.name}
                  </Typography>
                  
                  {pod.message && (
                    <Alert severity="error" sx={{ mt: 1, mb: 1, py: 0, fontSize: '0.75rem' }}>
                      {pod.message}
                    </Alert>
                  )}
                  
                  {linkedPods.length > 0 && (
                    <Box sx={{ mt: 1, mb: 1, p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Linked Services:
                      </Typography>
                      {linkedPods.map(lp => (
                        <Chip 
                          key={lp.name} 
                          label={lp.type} 
                          size="small" 
                          variant="outlined" 
                          sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                        />
                      ))}
                    </Box>
                  )}

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

                  {pod.external_url && (
                    <Button 
                      variant="contained" 
                      fullWidth 
                      size="small"
                      href={pod.external_url}
                      target="_blank"
                      sx={{ mb: 1, bgcolor: 'primary.main', color: 'white' }}
                    >
                      Open via Domain ↗
                    </Button>
                  )}
                  
                  {pod.node_port && !pod.external_url && (
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      size="small"
                      href={`http://${pod.public_ip}:${pod.node_port}`}
                      target="_blank"
                      sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'primary.main' }}
                    >
                      Open via IP:Port ↗
                    </Button>
                  )}

                  <Button 
                      variant="outlined" 
                      fullWidth 
                      size="small"
                      onClick={() => handleViewLogs(pod.name)}
                      sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
                    >
                      View Logs
                  </Button>
                  
                  <Box display="flex" gap={1} mb={2}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<MemoryIcon />}
                      onClick={() => handleViewMetrics(pod.name)}
                      sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
                      disabled={pod.status !== 'Running'}
                    >
                      Metrics
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<SettingsIcon />}
                      onClick={() => handleViewEnv(pod.name)}
                      sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
                    >
                      Env Vars
                    </Button>
                  </Box>

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
          );
          })}
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

      {/* Metrics Dialog */}
      <Dialog open={metricsOpen} onClose={() => setMetricsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0a1929' } }}>
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <MemoryIcon />
            Resource Usage: {metricsPodName}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {metricsLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : currentMetrics?.error ? (
            <Alert severity="error">{currentMetrics.error}</Alert>
          ) : currentMetrics ? (
            <Box>
              {/* CPU Usage */}
              <Box mb={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  CPU Usage
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <LinearProgress 
                      variant="determinate" 
                      value={currentMetrics.cpu_percent || 0} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: currentMetrics.cpu_percent > 80 ? 'error.main' : 
                                   currentMetrics.cpu_percent > 50 ? 'warning.main' : 'success.main'
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="body1" color="text.primary" sx={{ minWidth: 80 }}>
                    {currentMetrics.cpu_usage}
                  </Typography>
                </Box>
                {currentMetrics.cpu_percent && (
                  <Typography variant="caption" color="text.secondary">
                    {currentMetrics.cpu_percent}% of limit
                  </Typography>
                )}
              </Box>

              {/* Memory Usage */}
              <Box mb={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Memory Usage
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <LinearProgress 
                      variant="determinate" 
                      value={currentMetrics.memory_percent || 0} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: currentMetrics.memory_percent > 80 ? 'error.main' : 
                                   currentMetrics.memory_percent > 50 ? 'warning.main' : 'primary.main'
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="body1" color="text.primary" sx={{ minWidth: 80 }}>
                    {currentMetrics.memory_usage}
                  </Typography>
                </Box>
                {currentMetrics.memory_percent && (
                  <Typography variant="caption" color="text.secondary">
                    {currentMetrics.memory_percent}% of limit
                  </Typography>
                )}
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Metrics auto-refresh every 3 seconds
              </Alert>
            </Box>
          ) : (
            <Typography color="text.secondary">No metrics available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetricsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Environment Variables Dialog */}
      <Dialog open={envOpen} onClose={() => setEnvOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0a1929' } }}>
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon />
            Environment Variables: {envDeploymentName}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {envLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Changing environment variables will restart the pod
              </Alert>
              
              {/* Current Env Vars List */}
              <List sx={{ bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1, mb: 2 }}>
                {Object.keys(currentEnvVars).length === 0 ? (
                  <ListItem>
                    <ListItemText 
                      primary="No environment variables set" 
                      sx={{ color: 'text.secondary' }}
                    />
                  </ListItem>
                ) : (
                  Object.entries(currentEnvVars).map(([key, value], index) => (
                    <React.Fragment key={key}>
                      {index > 0 && <Divider />}
                      <ListItem
                        secondaryAction={
                          value !== '(secret)' && (
                            <IconButton 
                              edge="end" 
                              color="error" 
                              size="small"
                              onClick={() => handleRemoveEnvVar(key)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )
                        }
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography 
                                component="span" 
                                sx={{ fontFamily: 'monospace', color: 'primary.main' }}
                              >
                                {key}
                              </Typography>
                              {value === '(secret)' && (
                                <Chip label="Secret" size="small" color="warning" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography 
                              component="span" 
                              sx={{ 
                                fontFamily: 'monospace', 
                                color: 'text.secondary',
                                wordBreak: 'break-all'
                              }}
                            >
                              {value === '(secret)' ? '••••••••' : value}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))
                )}
              </List>

              {/* Add New Env Var */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Add New Variable
              </Typography>
              <Box display="flex" gap={1} alignItems="flex-start">
                <TextField
                  size="small"
                  label="Key"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  placeholder="MY_VAR"
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Value"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  placeholder="value"
                  sx={{ flex: 2 }}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleAddEnvVar}
                  disabled={!newEnvKey.trim()}
                >
                  Add
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setEnvOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSaveEnvVars} variant="contained" color="primary">
            Save & Restart Pod
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;
