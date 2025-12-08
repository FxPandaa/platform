import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Slider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fade,
  Collapse,
  useTheme,
  useMediaQuery,
  Drawer,
  AppBar,
  Toolbar,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Terminal as TerminalIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Backup as BackupIcon,
  RestartAlt as RestartIcon,
  Scale as ScaleIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Apps as AppsIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { COLORS, STATUS_COLORS, ANIMATION_DURATION } from './theme';
import { usePolling, useNotification, usePodActions } from './hooks';
import StatusBadge from './components/common/StatusBadge';
import ResourceBar from './components/common/ResourceBar';

const API_BASE = 'http://192.168.154.114:30001';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pod-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

// Pod Card Component
const PodCard = React.memo(({ 
  pod, 
  onViewDetails, 
  onDelete, 
  onRestart,
  isDeleting 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'running': return <CheckCircleIcon sx={{ color: STATUS_COLORS.Running }} />;
      case 'pending': return <PendingIcon sx={{ color: STATUS_COLORS.Pending }} />;
      case 'failed': return <ErrorIcon sx={{ color: STATUS_COLORS.Failed }} />;
      case 'terminated': return <ErrorIcon sx={{ color: STATUS_COLORS.Terminated }} />;
      default: return <WarningIcon sx={{ color: STATUS_COLORS.Unknown }} />;
    }
  };

  return (
    <Fade in timeout={ANIMATION_DURATION.normal}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 3,
          transition: `all ${ANIMATION_DURATION.normal}ms ease`,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(99, 102, 241, 0.15)',
            borderColor: 'rgba(99, 102, 241, 0.4)',
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
              {getStatusIcon(pod.status)}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: '#f1f5f9',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {pod.name}
              </Typography>
            </Box>
            <StatusBadge status={pod.status} size="small" />
          </Box>

          {/* Info Grid */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', minWidth: 60 }}>
                Image:
              </Typography>
              <Tooltip title={pod.image || 'N/A'}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {pod.image?.split('/').pop() || 'N/A'}
                </Typography>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', minWidth: 60 }}>
                Restarts:
              </Typography>
              <Chip
                size="small"
                label={pod.restarts || 0}
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: pod.restarts > 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: pod.restarts > 5 ? '#ef4444' : '#a5b4fc',
                }}
              />
            </Box>

            {/* Resource Usage */}
            {(pod.cpu_usage || pod.memory_usage) && (
              <Box sx={{ mt: 1 }}>
                {pod.cpu_usage && (
                  <ResourceBar
                    label="CPU"
                    value={parseFloat(pod.cpu_usage) || 0}
                    max={100}
                    unit="%"
                    color={COLORS.primary}
                    size="small"
                  />
                )}
                {pod.memory_usage && (
                  <ResourceBar
                    label="Memory"
                    value={parseFloat(pod.memory_usage) || 0}
                    max={100}
                    unit="%"
                    color={COLORS.secondary}
                    size="small"
                  />
                )}
              </Box>
            )}
          </Box>
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => onViewDetails(pod)}
            sx={{
              flex: 1,
              borderColor: 'rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#6366f1',
                bgcolor: 'rgba(99, 102, 241, 0.1)',
              },
            }}
          >
            Details
          </Button>
          <Tooltip title="Restart Pod">
            <IconButton
              size="small"
              onClick={() => onRestart(pod.name)}
              sx={{ color: '#fbbf24' }}
            >
              <RestartIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Pod">
            <IconButton
              size="small"
              onClick={() => onDelete(pod.name)}
              disabled={isDeleting}
              sx={{ color: '#ef4444' }}
            >
              {isDeleting ? <CircularProgress size={18} /> : <DeleteIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    </Fade>
  );
});

// EUSUITE Card Component
const EusuiteCard = React.memo(({ 
  pods, 
  onViewDetails, 
  onUndeploy,
  isUndeploying 
}) => {
  const [expanded, setExpanded] = useState(false);
  const runningCount = pods.filter(p => p.status === 'Running').length;
  const totalCount = pods.length;

  return (
    <Fade in timeout={ANIMATION_DURATION.normal}>
      <Card
        sx={{
          background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppsIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                  EUSUITE Office 365
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Dylan's Office Suite
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${runningCount}/${totalCount} Running`}
              sx={{
                bgcolor: runningCount === totalCount 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'rgba(251, 191, 36, 0.2)',
                color: runningCount === totalCount ? '#22c55e' : '#fbbf24',
                fontWeight: 500,
              }}
            />
          </Box>

          {/* Progress */}
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={(runningCount / totalCount) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #6366f1 0%, #22c55e 100%)',
                },
              }}
            />
          </Box>

          {/* Expandable Pod List */}
          <Collapse in={expanded}>
            <Divider sx={{ my: 2, borderColor: 'rgba(99, 102, 241, 0.2)' }} />
            <List dense sx={{ py: 0 }}>
              {pods.map((pod) => (
                <ListItem
                  key={pod.name}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: 'rgba(15, 23, 42, 0.5)',
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
                  }}
                  secondaryAction={
                    <IconButton 
                      size="small" 
                      onClick={() => onViewDetails(pod)}
                      sx={{ color: '#a5b4fc' }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <StatusBadge status={pod.status} size="small" showLabel={false} />
                  </ListItemIcon>
                  <ListItemText
                    primary={pod.name}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: { color: '#e2e8f0', fontWeight: 500 },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ color: '#a5b4fc' }}
          >
            {expanded ? 'Hide' : 'Show'} Apps ({pods.length})
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={onUndeploy}
            disabled={isUndeploying}
            startIcon={isUndeploying ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{
              borderColor: 'rgba(239, 68, 68, 0.3)',
              '&:hover': {
                borderColor: '#ef4444',
                bgcolor: 'rgba(239, 68, 68, 0.1)',
              },
            }}
          >
            Undeploy
          </Button>
        </CardActions>
      </Card>
    </Fade>
  );
});

// Pod Detail Modal Component
const PodDetailModal = ({ 
  open, 
  onClose, 
  pod, 
  token,
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [logs, setLogs] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [envVars, setEnvVars] = useState([]);
  const [storage, setStorage] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!pod) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/pods/${pod.name}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(response.data.logs || 'No logs available');
    } catch (err) {
      setLogs('Error fetching logs: ' + (err.response?.data?.detail || err.message));
    }
    setLoading(false);
  }, [pod, token]);

  const fetchMetrics = useCallback(async () => {
    if (!pod) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/pods/${pod.name}/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMetrics(response.data);
    } catch (err) {
      setMetrics(null);
    }
    setLoading(false);
  }, [pod, token]);

  const fetchEnvVars = useCallback(async () => {
    if (!pod) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/pods/${pod.name}/env`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnvVars(response.data.env_vars || []);
    } catch (err) {
      setEnvVars([]);
    }
    setLoading(false);
  }, [pod, token]);

  const fetchStorage = useCallback(async () => {
    if (!pod) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/pods/${pod.name}/storage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStorage(response.data.volumes || []);
    } catch (err) {
      setStorage([]);
    }
    setLoading(false);
  }, [pod, token]);

  useEffect(() => {
    if (open && pod) {
      switch (activeTab) {
        case 0: // Info - no fetch needed
          break;
        case 1:
          fetchLogs();
          break;
        case 2:
          fetchMetrics();
          break;
        case 3:
          fetchEnvVars();
          break;
        case 4:
          fetchStorage();
          break;
        default:
          break;
      }
    }
  }, [open, pod, activeTab, fetchLogs, fetchMetrics, fetchEnvVars, fetchStorage]);

  if (!pod) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e293b',
          backgroundImage: 'none',
          borderRadius: 3,
          border: '1px solid rgba(99, 102, 241, 0.2)',
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StatusBadge status={pod.status} />
          <Typography variant="h6" sx={{ color: '#f1f5f9' }}>
            {pod.name}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#94a3b8' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
          '& .MuiTab-root': { color: '#94a3b8' },
          '& .Mui-selected': { color: '#6366f1' },
          '& .MuiTabs-indicator': { bgcolor: '#6366f1' },
        }}
      >
        <Tab label="Info" icon={<SettingsIcon />} iconPosition="start" />
        <Tab label="Logs" icon={<TerminalIcon />} iconPosition="start" />
        <Tab label="Metrics" icon={<TimelineIcon />} iconPosition="start" />
        <Tab label="Environment" icon={<SettingsIcon />} iconPosition="start" />
        <Tab label="Storage" icon={<StorageIcon />} iconPosition="start" />
      </Tabs>

      <DialogContent sx={{ p: 0, minHeight: 400 }}>
        {loading && <LinearProgress sx={{ bgcolor: 'rgba(99, 102, 241, 0.2)' }} />}

        {/* Info Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                  Pod Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Name"
                      secondary={pod.name}
                      primaryTypographyProps={{ color: '#94a3b8', variant: 'caption' }}
                      secondaryTypographyProps={{ color: '#e2e8f0' }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={pod.status}
                      primaryTypographyProps={{ color: '#94a3b8', variant: 'caption' }}
                      secondaryTypographyProps={{ color: STATUS_COLORS[pod.status] || '#94a3b8' }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Image"
                      secondary={pod.image || 'N/A'}
                      primaryTypographyProps={{ color: '#94a3b8', variant: 'caption' }}
                      secondaryTypographyProps={{ color: '#e2e8f0', sx: { wordBreak: 'break-all' } }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Restarts"
                      secondary={pod.restarts || 0}
                      primaryTypographyProps={{ color: '#94a3b8', variant: 'caption' }}
                      secondaryTypographyProps={{ color: pod.restarts > 5 ? '#ef4444' : '#e2e8f0' }}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                  Resource Usage
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <ResourceBar
                    label="CPU"
                    value={parseFloat(pod.cpu_usage) || 0}
                    max={100}
                    unit="%"
                    color={COLORS.primary}
                  />
                  <ResourceBar
                    label="Memory"
                    value={parseFloat(pod.memory_usage) || 0}
                    max={100}
                    unit="%"
                    color={COLORS.secondary}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Logs Tab */}
        <TabPanel value={activeTab} index={1}>
          <Paper
            sx={{
              p: 2,
              bgcolor: '#0f172a',
              borderRadius: 2,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#22c55e',
              maxHeight: 400,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {logs || 'No logs available'}
          </Paper>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLogs}
            sx={{ mt: 2 }}
          >
            Refresh Logs
          </Button>
        </TabPanel>

        {/* Metrics Tab */}
        <TabPanel value={activeTab} index={2}>
          {metrics ? (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2, textAlign: 'center' }}>
                  <SpeedIcon sx={{ fontSize: 40, color: '#6366f1', mb: 1 }} />
                  <Typography variant="h4" sx={{ color: '#f1f5f9' }}>
                    {metrics.cpu || '0%'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    CPU Usage
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2, textAlign: 'center' }}>
                  <MemoryIcon sx={{ fontSize: 40, color: '#8b5cf6', mb: 1 }} />
                  <Typography variant="h4" sx={{ color: '#f1f5f9' }}>
                    {metrics.memory || '0 Mi'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Memory Usage
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info" sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)' }}>
              No metrics available for this pod
            </Alert>
          )}
        </TabPanel>

        {/* Environment Tab */}
        <TabPanel value={activeTab} index={3}>
          {envVars.length > 0 ? (
            <Paper sx={{ bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 }}>
              <List dense>
                {envVars.map((env, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={env.name}
                      secondary={env.value || '***hidden***'}
                      primaryTypographyProps={{ color: '#6366f1', fontFamily: 'monospace' }}
                      secondaryTypographyProps={{ color: '#94a3b8', fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Alert severity="info" sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)' }}>
              No environment variables found
            </Alert>
          )}
        </TabPanel>

        {/* Storage Tab */}
        <TabPanel value={activeTab} index={4}>
          {storage.length > 0 ? (
            <List>
              {storage.map((vol, index) => (
                <Paper key={index} sx={{ mb: 1, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 }}>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon sx={{ color: '#6366f1' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={vol.name}
                      secondary={`Mount: ${vol.mountPath || 'N/A'} | Type: ${vol.type || 'Unknown'}`}
                      primaryTypographyProps={{ color: '#e2e8f0' }}
                      secondaryTypographyProps={{ color: '#94a3b8' }}
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)' }}>
              No storage volumes attached
            </Alert>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <Button onClick={onClose} sx={{ color: '#94a3b8' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Create Pod Modal Component
const CreatePodModal = ({ open, onClose, onCreate, loading }) => {
  const [podData, setPodData] = useState({
    name: '',
    image: '',
    port: '',
    replicas: 1,
    cpu_limit: '100m',
    memory_limit: '128Mi',
    env_vars: [],
  });
  const [newEnvVar, setNewEnvVar] = useState({ name: '', value: '' });

  const handleSubmit = () => {
    if (!podData.name || !podData.image) return;
    onCreate({
      ...podData,
      port: podData.port ? parseInt(podData.port) : undefined,
    });
  };

  const addEnvVar = () => {
    if (newEnvVar.name && newEnvVar.value) {
      setPodData(prev => ({
        ...prev,
        env_vars: [...prev.env_vars, { ...newEnvVar }],
      }));
      setNewEnvVar({ name: '', value: '' });
    }
  };

  const removeEnvVar = (index) => {
    setPodData(prev => ({
      ...prev,
      env_vars: prev.env_vars.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e293b',
          backgroundImage: 'none',
          borderRadius: 3,
          border: '1px solid rgba(99, 102, 241, 0.2)',
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
      }}>
        <AddIcon sx={{ color: '#6366f1' }} />
        <Typography variant="h6" sx={{ color: '#f1f5f9' }}>
          Deploy New Pod
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Pod Name"
              value={podData.name}
              onChange={(e) => setPodData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="my-app"
              InputProps={{
                sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 },
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Docker Image"
              value={podData.image}
              onChange={(e) => setPodData(prev => ({ ...prev, image: e.target.value }))}
              placeholder="nginx:latest"
              InputProps={{
                sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={podData.port}
              onChange={(e) => setPodData(prev => ({ ...prev, port: e.target.value }))}
              placeholder="80"
              InputProps={{
                sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Replicas"
              type="number"
              value={podData.replicas}
              onChange={(e) => setPodData(prev => ({ ...prev, replicas: parseInt(e.target.value) || 1 }))}
              InputProps={{
                sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 },
                inputProps: { min: 1, max: 10 },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="CPU Limit"
              value={podData.cpu_limit}
              onChange={(e) => setPodData(prev => ({ ...prev, cpu_limit: e.target.value }))}
              placeholder="100m"
              InputProps={{
                sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 },
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Memory Limit"
              value={podData.memory_limit}
              onChange={(e) => setPodData(prev => ({ ...prev, memory_limit: e.target.value }))}
              placeholder="128Mi"
              InputProps={{
                sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2 },
              }}
            />
          </Grid>

          {/* Environment Variables */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
              Environment Variables
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                placeholder="NAME"
                value={newEnvVar.name}
                onChange={(e) => setNewEnvVar(prev => ({ ...prev, name: e.target.value }))}
                sx={{ flex: 1 }}
                InputProps={{
                  sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 1 },
                }}
              />
              <TextField
                size="small"
                placeholder="VALUE"
                value={newEnvVar.value}
                onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                sx={{ flex: 1 }}
                InputProps={{
                  sx: { bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 1 },
                }}
              />
              <IconButton onClick={addEnvVar} sx={{ color: '#6366f1' }}>
                <AddIcon />
              </IconButton>
            </Box>
            {podData.env_vars.map((env, index) => (
              <Chip
                key={index}
                label={`${env.name}=${env.value}`}
                onDelete={() => removeEnvVar(index)}
                size="small"
                sx={{
                  mr: 0.5,
                  mb: 0.5,
                  bgcolor: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                }}
              />
            ))}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <Button onClick={onClose} sx={{ color: '#94a3b8' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !podData.name || !podData.image}
          startIcon={loading ? <CircularProgress size={18} /> : <AddIcon />}
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            },
          }}
        >
          Deploy Pod
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Dashboard Component
export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Auth State
  const [token] = useState(() => localStorage.getItem('token'));
  const [company] = useState(() => localStorage.getItem('company'));
  
  // UI State
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPod, setSelectedPod] = useState(null);
  
  // Data State
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eusuitePods, setEusuitePods] = useState([]);
  const [eusuiteDeployed, setEusuiteDeployed] = useState(false);
  
  // Action State
  const [actionLoading, setActionLoading] = useState({});
  
  // Notification State
  const { notification, showNotification, hideNotification } = useNotification();

  // Fetch pods
  const fetchPods = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/pods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allPods = response.data.pods || [];
      
      // Separate EUSUITE pods
      const euPods = allPods.filter(p => 
        p.name.startsWith('eusuite-') || 
        p.name.startsWith('eumail-') || 
        p.name.startsWith('eucloud-') || 
        p.name.startsWith('eutype-') || 
        p.name.startsWith('eugroups-') || 
        p.name.startsWith('euadmin-')
      );
      const regularPods = allPods.filter(p => 
        !p.name.startsWith('eusuite-') && 
        !p.name.startsWith('eumail-') && 
        !p.name.startsWith('eucloud-') && 
        !p.name.startsWith('eutype-') && 
        !p.name.startsWith('eugroups-') && 
        !p.name.startsWith('euadmin-')
      );
      
      setPods(regularPods);
      setEusuitePods(euPods);
      setEusuiteDeployed(euPods.length > 0);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
      setLoading(false);
    }
  }, [token]);

  // Polling for pods
  usePolling(fetchPods, 10000);

  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchPods();
    } else {
      navigate('/login');
    }
  }, [token, navigate, fetchPods]);

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('company');
    navigate('/login');
  };

  const handleCreatePod = async (podData) => {
    setActionLoading(prev => ({ ...prev, create: true }));
    try {
      await axios.post(`${API_BASE}/pods`, podData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification(`Pod "${podData.name}" created successfully`, 'success');
      setCreateModalOpen(false);
      fetchPods();
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to create pod', 'error');
    }
    setActionLoading(prev => ({ ...prev, create: false }));
  };

  const handleDeletePod = async (podName) => {
    if (!window.confirm(`Are you sure you want to delete pod "${podName}"?`)) return;
    
    setActionLoading(prev => ({ ...prev, [podName]: true }));
    try {
      await axios.delete(`${API_BASE}/pods/${podName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification(`Pod "${podName}" deleted successfully`, 'success');
      fetchPods();
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to delete pod', 'error');
    }
    setActionLoading(prev => ({ ...prev, [podName]: false }));
  };

  const handleRestartPod = async (podName) => {
    setActionLoading(prev => ({ ...prev, [`restart-${podName}`]: true }));
    try {
      await axios.post(`${API_BASE}/pods/${podName}/restart`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification(`Pod "${podName}" restarted successfully`, 'success');
      fetchPods();
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to restart pod', 'error');
    }
    setActionLoading(prev => ({ ...prev, [`restart-${podName}`]: false }));
  };

  const handleViewDetails = (pod) => {
    setSelectedPod(pod);
    setDetailModalOpen(true);
  };

  const handleDeployEusuite = async () => {
    setActionLoading(prev => ({ ...prev, eusuite: true }));
    try {
      await axios.post(`${API_BASE}/eusuite/deploy`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification('EUSUITE deployment started successfully', 'success');
      fetchPods();
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to deploy EUSUITE', 'error');
    }
    setActionLoading(prev => ({ ...prev, eusuite: false }));
  };

  const handleUndeployEusuite = async () => {
    if (!window.confirm('Are you sure you want to undeploy all EUSUITE applications?')) return;
    
    setActionLoading(prev => ({ ...prev, eusuite: true }));
    try {
      await axios.post(`${API_BASE}/eusuite/undeploy`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification('EUSUITE undeployed successfully', 'success');
      fetchPods();
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to undeploy EUSUITE', 'error');
    }
    setActionLoading(prev => ({ ...prev, eusuite: false }));
  };

  // Sidebar content
  const sidebarContent = (
    <Box
      sx={{
        width: 260,
        height: '100%',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRight: '1px solid rgba(99, 102, 241, 0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Shield-SaaS
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Kubernetes Platform
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 2 }}>
        <List>
          <ListItem
            button
            selected
            sx={{
              mx: 1,
              borderRadius: 2,
              '&.Mui-selected': {
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
              },
            }}
          >
            <ListItemIcon>
              <DashboardIcon sx={{ color: '#6366f1' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Dashboard" 
              primaryTypographyProps={{ color: '#f1f5f9', fontWeight: 500 }}
            />
          </ListItem>
          <ListItem
            button
            onClick={() => navigate('/monitoring')}
            sx={{
              mx: 1,
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
            }}
          >
            <ListItemIcon>
              <TimelineIcon sx={{ color: '#94a3b8' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Monitoring" 
              primaryTypographyProps={{ color: '#94a3b8' }}
            />
          </ListItem>
        </List>
      </Box>

      {/* User Info */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <Paper
          sx={{
            p: 2,
            bgcolor: 'rgba(15, 23, 42, 0.5)',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 500 }}>
            {company || 'Company'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Active Workspace
          </Typography>
        </Paper>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            mt: 2,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            '&:hover': {
              borderColor: '#ef4444',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0f172a' }}>
      {/* Sidebar - Desktop */}
      {!isMobile && (
        <Box component="nav" sx={{ flexShrink: 0 }}>
          {sidebarContent}
        </Box>
      )}

      {/* Sidebar - Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'transparent',
            borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 2, color: '#94a3b8' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1, color: '#f1f5f9', fontWeight: 600 }}>
              Pod Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
              sx={{
                mr: 2,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                },
              }}
            >
              New Pod
            </Button>
            <IconButton onClick={fetchPods} sx={{ color: '#94a3b8' }}>
              <RefreshIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress sx={{ color: '#6366f1' }} />
            </Box>
          ) : (
            <>
              {/* EUSUITE Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ color: '#94a3b8', mb: 2, fontWeight: 500 }}>
                  EUSUITE Office 365
                </Typography>
                {eusuiteDeployed ? (
                  <EusuiteCard
                    pods={eusuitePods}
                    onViewDetails={handleViewDetails}
                    onUndeploy={handleUndeployEusuite}
                    isUndeploying={actionLoading.eusuite}
                  />
                ) : (
                  <Card
                    sx={{
                      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%)',
                      border: '1px dashed rgba(99, 102, 241, 0.3)',
                      borderRadius: 3,
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <AppsIcon sx={{ fontSize: 48, color: '#64748b', mb: 2 }} />
                      <Typography variant="h6" sx={{ color: '#94a3b8', mb: 1 }}>
                        Deploy EUSUITE Office 365
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                        One-click deployment of Dylan's complete Office 365 suite
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={actionLoading.eusuite ? <CircularProgress size={18} /> : <CloudUploadIcon />}
                        onClick={handleDeployEusuite}
                        disabled={actionLoading.eusuite}
                        sx={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          },
                        }}
                      >
                        Deploy EUSUITE
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </Box>

              {/* Regular Pods Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                    Your Pods
                  </Typography>
                  <Chip
                    label={`${pods.length} pods`}
                    size="small"
                    sx={{ bgcolor: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}
                  />
                </Box>
                
                {pods.length === 0 ? (
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      bgcolor: 'rgba(30, 41, 59, 0.5)',
                      border: '1px dashed rgba(99, 102, 241, 0.3)',
                      borderRadius: 3,
                    }}
                  >
                    <Typography variant="body1" sx={{ color: '#94a3b8' }}>
                      No pods deployed yet. Click "New Pod" to get started.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={2}>
                    {pods.map((pod) => (
                      <Grid item xs={12} sm={6} lg={4} xl={3} key={pod.name}>
                        <PodCard
                          pod={pod}
                          onViewDetails={handleViewDetails}
                          onDelete={handleDeletePod}
                          onRestart={handleRestartPod}
                          isDeleting={actionLoading[pod.name]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Modals */}
      <CreatePodModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreatePod}
        loading={actionLoading.create}
      />
      <PodDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        pod={selectedPod}
        token={token}
        onRefresh={fetchPods}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
