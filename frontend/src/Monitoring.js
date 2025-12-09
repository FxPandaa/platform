import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Box,
  IconButton,
  LinearProgress,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Euro as EuroIcon,
  Dns as DnsIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import axios from 'axios';
import { COLORS as THEME_COLORS } from './theme';
import MainLayout from './components/layout/MainLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

// Color palette - use theme colors for consistency
const COLORS = {
  primary: THEME_COLORS.primary,
  success: THEME_COLORS.success,
  warning: THEME_COLORS.warning,
  error: THEME_COLORS.error,
  info: THEME_COLORS.info,
  purple: THEME_COLORS.secondary,
  cyan: '#06b6d4',
  pink: '#ec4899'
};

const STATUS_COLORS = {
  Running: COLORS.success,
  Pending: COLORS.warning,
  Failed: COLORS.error,
  Succeeded: COLORS.info,
  Unknown: '#64748b'
};

const CATEGORY_COLORS = {
  app: COLORS.primary,
  db: COLORS.purple,
  cache: COLORS.cyan,
  monitoring: COLORS.pink,
  other: '#64748b'
};

function Monitoring() {
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  
  const navigate = useNavigate();

  const fetchMonitoringData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/monitoring`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMonitoringData(response.data);
      
      // Add to historical data for charts (keep last 20 data points)
      setHistoricalData(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          cpu: response.data.summary.total_cpu_millicores,
          memory: response.data.summary.total_memory_mi,
          pods: response.data.summary.total_pods
        };
        const updated = [...prev, newPoint].slice(-20);
        return updated;
      });
      
    } catch (error) {
      // Handle auth errors silently
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(() => fetchMonitoringData(), 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ 
          bgcolor: 'rgba(15, 23, 42, 0.95)', 
          p: 1.5, 
          borderRadius: 1, 
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)} {entry.name === 'CPU' ? 'm' : entry.name === 'Memory' ? 'Mi' : ''}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <MainLayout title="Monitoring">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} sx={{ color: '#6366f1' }} />
        </Box>
      </MainLayout>
    );
  }

  const summary = monitoringData?.summary || {};
  const pods = monitoringData?.pods || [];
  const deployments = monitoringData?.deployments || [];

  // Prepare chart data
  const statusData = Object.entries(summary.status_counts || {})
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] }));

  const categoryData = Object.entries(summary.category_counts || {})
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: CATEGORY_COLORS[name] }));

  const podResourceData = pods.map(pod => ({
    name: pod.name.length > 15 ? pod.name.substring(0, 15) + '...' : pod.name,
    fullName: pod.name,
    cpu: pod.cpu_millicores,
    memory: pod.memory_mi
  }));

  // Action buttons for AppBar
  const actionButtons = (
    <>
      <Tooltip title="Refresh">
        <IconButton 
          color="inherit" 
          onClick={() => fetchMonitoringData(true)} 
          disabled={refreshing}
          sx={{ color: '#94a3b8' }}
        >
          <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </IconButton>
      </Tooltip>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );

  return (
    <MainLayout title="Monitoring" actions={actionButtons}>
      {/* Refresh indicator */}
      {refreshing && <LinearProgress sx={{ height: 2, mb: 2, borderRadius: 1 }} />}

      <Container maxWidth="xl" disableGutters>
        {/* Summary Cards */}
        <Fade in timeout={500}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Total Pods */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 3
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="overline" color="text.secondary">Total Pods</Typography>
                      <Typography variant="h3" fontWeight="bold" color="primary.main">
                        {summary.total_pods || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: 2, 
                      bgcolor: 'rgba(99, 102, 241, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <DnsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    </Box>
                  </Box>
                  <Box display="flex" gap={1} mt={2}>
                    <Chip 
                      size="small" 
                      icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                      label={`${summary.status_counts?.Running || 0} Running`}
                      sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: 'success.main', fontSize: '0.7rem' }}
                    />
                    {(summary.status_counts?.Pending || 0) > 0 && (
                      <Chip 
                        size="small" 
                        icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
                        label={`${summary.status_counts?.Pending} Pending`}
                        sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: 'warning.main', fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* CPU Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: 3
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="overline" color="text.secondary">CPU Usage</Typography>
                      <Typography variant="h3" fontWeight="bold" sx={{ color: COLORS.cyan }}>
                        {summary.total_cpu_millicores?.toFixed(0) || 0}
                        <Typography component="span" variant="h6" color="text.secondary">m</Typography>
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: 2, 
                      bgcolor: 'rgba(6, 182, 212, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <SpeedIcon sx={{ fontSize: 28, color: COLORS.cyan }} />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Total CPU across all pods
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Memory Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                borderRadius: 3
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="overline" color="text.secondary">Memory Usage</Typography>
                      <Typography variant="h3" fontWeight="bold" sx={{ color: COLORS.purple }}>
                        {summary.total_memory_mi?.toFixed(0) || 0}
                        <Typography component="span" variant="h6" color="text.secondary">Mi</Typography>
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: 2, 
                      bgcolor: 'rgba(168, 85, 247, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MemoryIcon sx={{ fontSize: 28, color: COLORS.purple }} />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Total memory across all pods
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly Cost */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 3
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="overline" color="text.secondary">Monthly Cost</Typography>
                      <Typography variant="h3" fontWeight="bold" sx={{ color: COLORS.success }}>
                        €{summary.total_monthly_cost?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: 2, 
                      bgcolor: 'rgba(34, 197, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <EuroIcon sx={{ fontSize: 28, color: COLORS.success }} />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Storage: {summary.total_storage_gi || 0}Gi / {summary.storage_quota_gi}Gi
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(summary.total_storage_gi / summary.storage_quota_gi) * 100 || 0}
                      sx={{ mt: 0.5, height: 4, borderRadius: 1 }}
                      color="success"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>

        {/* Charts Row */}
        <Fade in timeout={700}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Resource Usage Over Time */}
            <Grid item xs={12} md={8}>
              <Card sx={{ 
                bgcolor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                height: 350
              }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Resource Usage Over Time
                  </Typography>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="cpu" 
                        name="CPU" 
                        stroke={COLORS.cyan} 
                        fillOpacity={1} 
                        fill="url(#cpuGradient)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="memory" 
                        name="Memory" 
                        stroke={COLORS.purple} 
                        fillOpacity={1} 
                        fill="url(#memoryGradient)" 
                        strokeWidth={2}
                      />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Pod Status Distribution */}
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                bgcolor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                height: 350
              }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Pod Status
                  </Typography>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height={280}>
                      <Typography color="text.secondary">No pods deployed</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>

        {/* Second Charts Row */}
        <Fade in timeout={900}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Per-Pod Resource Usage */}
            <Grid item xs={12} md={8}>
              <Card sx={{ 
                bgcolor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                height: 350
              }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Resource Usage by Pod
                  </Typography>
                  {podResourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={podResourceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" stroke="#64748b" fontSize={12} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={120} />
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Box sx={{ 
                                  bgcolor: 'rgba(15, 23, 42, 0.95)', 
                                  p: 1.5, 
                                  borderRadius: 1, 
                                  border: '1px solid rgba(99, 102, 241, 0.3)'
                                }}>
                                  <Typography variant="body2" color="text.primary" fontWeight="bold">
                                    {payload[0]?.payload?.fullName}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: COLORS.cyan }}>
                                    CPU: {payload[0]?.value?.toFixed(1)}m
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: COLORS.purple }}>
                                    Memory: {payload[1]?.value?.toFixed(1)}Mi
                                  </Typography>
                                </Box>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="cpu" name="CPU (m)" fill={COLORS.cyan} radius={[0, 4, 4, 0]} />
                        <Bar dataKey="memory" name="Memory (Mi)" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height={280}>
                      <Typography color="text.secondary">No pods deployed</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Pod Categories */}
            <Grid item xs={12} md={4}>
              <Card sx={{ 
                bgcolor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 3,
                height: 350
              }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Pod Categories
                  </Typography>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height={280}>
                      <Typography color="text.secondary">No pods deployed</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>

        {/* Pods Table */}
        <Fade in timeout={1100}>
          <Card sx={{ 
            bgcolor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            mb: 4
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Pod Details
                </Typography>
                <Chip 
                  label={`${pods.length} pods`}
                  size="small"
                  sx={{ bgcolor: 'rgba(99, 102, 241, 0.2)', color: 'primary.main' }}
                />
              </Box>
              
              <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>Pod Name</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>Type</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>Status</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>CPU</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>Memory</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>Age</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>Restarts</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.1)' }}>Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pods.map((pod) => (
                      <TableRow key={pod.name} hover sx={{ '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' } }}>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {pod.name.length > 30 ? pod.name.substring(0, 30) + '...' : pod.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Chip 
                            label={pod.type.split('-')[0]} 
                            size="small" 
                            sx={{ 
                              bgcolor: 'rgba(99, 102, 241, 0.2)', 
                              color: 'primary.light',
                              fontSize: '0.7rem'
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Chip 
                            icon={
                              pod.status === 'Running' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> :
                              pod.status === 'Pending' ? <ScheduleIcon sx={{ fontSize: 14 }} /> :
                              <ErrorIcon sx={{ fontSize: 14 }} />
                            }
                            label={pod.status} 
                            size="small"
                            sx={{ 
                              bgcolor: `${STATUS_COLORS[pod.status] || STATUS_COLORS.Unknown}20`,
                              color: STATUS_COLORS[pod.status] || STATUS_COLORS.Unknown,
                              fontSize: '0.7rem'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color: COLORS.cyan }}>
                            {pod.cpu_millicores?.toFixed(1) || 0}m
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color: COLORS.purple }}>
                            {pod.memory_mi?.toFixed(1) || 0}Mi
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" color="text.secondary">
                            {pod.age_hours < 1 ? '<1h' : `${Math.floor(pod.age_hours)}h`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography 
                            variant="body2" 
                            sx={{ color: pod.restarts > 0 ? 'warning.main' : 'text.secondary' }}
                          >
                            {pod.restarts}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" color="success.main">
                            €{pod.cost?.toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pods.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4, borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography color="text.secondary">No pods deployed yet</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Fade>

        {/* Deployments with Scaling Info */}
        <Fade in timeout={1300}>
          <Card sx={{ 
            bgcolor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Deployments & Scaling
                </Typography>
                <Chip 
                  icon={<LayersIcon sx={{ fontSize: 14 }} />}
                  label={`${deployments.length} deployments`}
                  size="small"
                  sx={{ bgcolor: 'rgba(168, 85, 247, 0.2)', color: COLORS.purple }}
                />
              </Box>
              
              <Grid container spacing={2}>
                {deployments.map((deployment) => (
                  <Grid item xs={12} sm={6} md={4} key={deployment.name}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(0,0,0,0.2)', 
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom noWrap>
                        {deployment.name}
                      </Typography>
                      
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" color="text.secondary">Replicas:</Typography>
                        <Chip 
                          size="small"
                          label={`${deployment.ready_replicas}/${deployment.desired_replicas}`}
                          sx={{ 
                            bgcolor: deployment.ready_replicas === deployment.desired_replicas 
                              ? 'rgba(34, 197, 94, 0.2)' 
                              : 'rgba(245, 158, 11, 0.2)',
                            color: deployment.ready_replicas === deployment.desired_replicas 
                              ? 'success.main' 
                              : 'warning.main',
                            fontSize: '0.75rem'
                          }}
                        />
                      </Box>
                      
                      {deployment.hpa ? (
                        <Box sx={{ 
                          mt: 1, 
                          p: 1, 
                          bgcolor: 'rgba(99, 102, 241, 0.1)', 
                          borderRadius: 1,
                          border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}>
                          <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                            <SpeedIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                            <Typography variant="caption" color="primary.main" fontWeight="bold">
                              Auto-Scaling Active
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {deployment.hpa.min_replicas} - {deployment.hpa.max_replicas} replicas
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            CPU Target: {deployment.hpa.cpu_target}%
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No auto-scaling configured
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
                {deployments.length === 0 && (
                  <Grid item xs={12}>
                    <Box textAlign="center" py={4}>
                      <Typography color="text.secondary">No deployments found</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Fade>

        {/* Footer */}
        <Box textAlign="center" mt={4}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {monitoringData?.timestamp ? new Date(monitoringData.timestamp).toLocaleString() : 'N/A'} • Auto-refresh every 30s
          </Typography>
        </Box>
      </Container>
    </MainLayout>
  );
}

export default Monitoring;
