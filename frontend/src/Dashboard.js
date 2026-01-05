import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Skeleton,
  InputAdornment,
  alpha,
  Avatar,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
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
  Apps as AppsIcon,
  Timeline as TimelineIcon,
  Replay as ReplayIcon,
  Search as SearchIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Web as WebIcon,
  Code as CodeIcon,
  DataObject as DatabaseIcon,
  Dns as CacheIcon,
  Security as SecurityIcon,
  Analytics as MonitoringIcon,
  Folder as FilesIcon,
  Message as MessagingIcon,
  SmartToy as AIIcon,
  Stream as StreamingIcon,
} from '@mui/icons-material';
import { COLORS, STATUS_COLORS, ANIMATION_DURATION, useThemeContext } from './theme';
import { usePolling, useNotification } from './hooks';
import StatusBadge from './components/common/StatusBadge';
import ResourceBar from './components/common/ResourceBar';
import MainLayout from './components/layout/MainLayout';

const API_BASE = 'http://192.168.154.114:30001';

// ============================================
// APPLICATION CATALOG - Rich deployment options
// ============================================

const APPLICATION_CATALOG = {
  categories: [
    { id: 'all', name: 'All Applications', icon: AppsIcon },
    { id: 'web', name: 'Web Servers', icon: WebIcon },
    { id: 'database', name: 'Databases', icon: DatabaseIcon },
    { id: 'cache', name: 'Cache & Queue', icon: CacheIcon },
    { id: 'monitoring', name: 'Monitoring', icon: MonitoringIcon },
    { id: 'security', name: 'Security', icon: SecurityIcon },
    { id: 'files', name: 'File Storage', icon: FilesIcon },
    { id: 'messaging', name: 'Messaging', icon: MessagingIcon },
    { id: 'ai', name: 'AI & ML', icon: AIIcon },
    { id: 'streaming', name: 'Streaming', icon: StreamingIcon },
  ],
  
  applications: [
    // Web Servers
    {
      id: 'nginx',
      name: 'NGINX',
      image: 'nginx:latest',
      category: 'web',
      description: 'High-performance web server and reverse proxy',
      port: 80,
      color: '#009639',
      popular: true,
      resources: { cpu: '100m', memory: '128Mi' },
    },
    {
      id: 'apache',
      name: 'Apache HTTP',
      image: 'httpd:latest',
      category: 'web',
      description: 'Classic Apache HTTP Server',
      port: 80,
      color: '#D22128',
      resources: { cpu: '100m', memory: '128Mi' },
    },
    {
      id: 'caddy',
      name: 'Caddy',
      image: 'caddy:latest',
      category: 'web',
      description: 'Modern web server with automatic HTTPS',
      port: 80,
      color: '#1F88C9',
      resources: { cpu: '100m', memory: '64Mi' },
    },
    {
      id: 'traefik',
      name: 'Traefik',
      image: 'traefik:latest',
      category: 'web',
      description: 'Cloud-native edge router and load balancer',
      port: 80,
      color: '#24A1C1',
      resources: { cpu: '200m', memory: '256Mi' },
    },
    
    // Databases
    {
      id: 'postgres',
      name: 'PostgreSQL',
      image: 'postgres:15',
      category: 'database',
      description: 'Powerful open-source relational database',
      port: 5432,
      color: '#336791',
      popular: true,
      resources: { cpu: '250m', memory: '512Mi' },
      env_defaults: [
        { name: 'POSTGRES_PASSWORD', value: 'changeme' },
        { name: 'POSTGRES_DB', value: 'app' },
      ],
    },
    {
      id: 'mysql',
      name: 'MySQL',
      image: 'mysql:8',
      category: 'database',
      description: 'Popular open-source relational database',
      port: 3306,
      color: '#4479A1',
      popular: true,
      resources: { cpu: '250m', memory: '512Mi' },
      env_defaults: [{ name: 'MYSQL_ROOT_PASSWORD', value: 'changeme' }],
    },
    {
      id: 'mariadb',
      name: 'MariaDB',
      image: 'mariadb:latest',
      category: 'database',
      description: 'Community-developed MySQL fork',
      port: 3306,
      color: '#003545',
      resources: { cpu: '250m', memory: '512Mi' },
      env_defaults: [{ name: 'MARIADB_ROOT_PASSWORD', value: 'changeme' }],
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      image: 'mongo:latest',
      category: 'database',
      description: 'Document-oriented NoSQL database',
      port: 27017,
      color: '#47A248',
      popular: true,
      resources: { cpu: '250m', memory: '512Mi' },
    },
    {
      id: 'mssql',
      name: 'SQL Server',
      image: 'mcr.microsoft.com/mssql/server:2022-latest',
      category: 'database',
      description: 'Microsoft SQL Server database',
      port: 1433,
      color: '#CC2927',
      resources: { cpu: '500m', memory: '2Gi' },
      env_defaults: [
        { name: 'ACCEPT_EULA', value: 'Y' },
        { name: 'SA_PASSWORD', value: 'YourStrong@Passw0rd' },
      ],
    },
    
    // Cache & Queue
    {
      id: 'redis',
      name: 'Redis',
      image: 'redis:latest',
      category: 'cache',
      description: 'In-memory data store and cache',
      port: 6379,
      color: '#DC382D',
      popular: true,
      resources: { cpu: '100m', memory: '128Mi' },
    },
    {
      id: 'memcached',
      name: 'Memcached',
      image: 'memcached:latest',
      category: 'cache',
      description: 'High-performance memory caching system',
      port: 11211,
      color: '#7B8F9C',
      resources: { cpu: '100m', memory: '128Mi' },
    },
    {
      id: 'rabbitmq',
      name: 'RabbitMQ',
      image: 'rabbitmq:3-management',
      category: 'cache',
      description: 'Message broker with management UI',
      port: 15672,
      color: '#FF6600',
      resources: { cpu: '200m', memory: '256Mi' },
    },
    
    // Monitoring
    {
      id: 'prometheus',
      name: 'Prometheus',
      image: 'prom/prometheus:latest',
      category: 'monitoring',
      description: 'Metrics collection and alerting',
      port: 9090,
      color: '#E6522C',
      resources: { cpu: '200m', memory: '512Mi' },
    },
    {
      id: 'grafana',
      name: 'Grafana',
      image: 'grafana/grafana:latest',
      category: 'monitoring',
      description: 'Analytics and monitoring dashboards',
      port: 3000,
      color: '#F46800',
      popular: true,
      resources: { cpu: '100m', memory: '256Mi' },
    },
    {
      id: 'influxdb',
      name: 'InfluxDB',
      image: 'influxdb:latest',
      category: 'monitoring',
      description: 'Time-series database for metrics',
      port: 8086,
      color: '#22ADF6',
      resources: { cpu: '200m', memory: '512Mi' },
    },
    
    // File Storage
    {
      id: 'minio',
      name: 'MinIO',
      image: 'minio/minio:latest',
      category: 'files',
      description: 'S3-compatible object storage',
      port: 9000,
      color: '#C72C48',
      resources: { cpu: '200m', memory: '512Mi' },
      env_defaults: [
        { name: 'MINIO_ROOT_USER', value: 'admin' },
        { name: 'MINIO_ROOT_PASSWORD', value: 'changeme123' },
      ],
    },
    {
      id: 'nextcloud',
      name: 'Nextcloud',
      image: 'nextcloud:latest',
      category: 'files',
      description: 'Self-hosted file sync and share',
      port: 80,
      color: '#0082C9',
      resources: { cpu: '200m', memory: '512Mi' },
    },
    
    // Messaging
    {
      id: 'rocketchat',
      name: 'Rocket.Chat',
      image: 'rocket.chat:latest',
      category: 'messaging',
      description: 'Open-source team communication',
      port: 3000,
      color: '#F5455C',
      resources: { cpu: '200m', memory: '512Mi' },
    },
    {
      id: 'mattermost',
      name: 'Mattermost',
      image: 'mattermost/mattermost-team-edition:latest',
      category: 'messaging',
      description: 'Enterprise messaging platform',
      port: 8065,
      color: '#0058CC',
      resources: { cpu: '200m', memory: '512Mi' },
    },
    
    // Development
    {
      id: 'node',
      name: 'Node.js',
      image: 'node:lts',
      category: 'web',
      description: 'JavaScript runtime for server apps',
      port: 3000,
      color: '#339933',
      resources: { cpu: '100m', memory: '256Mi' },
    },
    {
      id: 'python',
      name: 'Python',
      image: 'python:3.11',
      category: 'web',
      description: 'Python runtime environment',
      port: 8000,
      color: '#3776AB',
      resources: { cpu: '100m', memory: '256Mi' },
    },
    
    // Custom
    {
      id: 'custom',
      name: 'Custom Image',
      image: '',
      category: 'all',
      description: 'Deploy any Docker image',
      port: 80,
      color: '#6366F1',
      isCustom: true,
      resources: { cpu: '100m', memory: '128Mi' },
    },
  ],
};

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
          bgcolor: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 1,
          transition: 'border-color 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.12)',
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
              borderColor: 'rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#6366f1',
                bgcolor: 'rgba(99, 102, 241, 0.08)',
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
          bgcolor: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1,
                  bgcolor: '#6366f1',
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
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: runningCount === totalCount ? '#22c55e' : '#6366f1',
                },
              }}
            />
          </Box>

          {/* Expandable Pod List */}
          <Collapse in={expanded}>
            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.06)' }} />
            <List dense sx={{ py: 0 }}>
              {pods.map((pod) => (
                <ListItem
                  key={pod.name}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
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

// Pod Detail Modal Component with Add Storage/Scaling/Backup functionality
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
  const [actionLoading, setActionLoading] = useState(false);
  
  // Storage config state
  const [storageSize, setStorageSize] = useState('1Gi');
  const [showStorageForm, setShowStorageForm] = useState(false);
  
  // Scaling config state
  const [scalingConfig, setScalingConfig] = useState({ min: 1, max: 3, cpuThreshold: 70 });
  const [showScalingForm, setShowScalingForm] = useState(false);
  
  // Environment variables config state
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  
  // Notification state
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

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
          borderRadius: 1,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
          {/* Add Environment Variable Section */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 1 }}>
            {!showEnvForm ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                    Add Environment Variable
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Configure environment variables for your container
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowEnvForm(true)}
                  sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                >
                  Add Variable
                </Button>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#f1f5f9', mb: 2, fontWeight: 600 }}>
                  New Environment Variable
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    label="Key"
                    placeholder="e.g. DATABASE_URL"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    size="small"
                    label="Value"
                    placeholder="e.g. postgres://..."
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    sx={{ minWidth: 240, flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={actionLoading || !newEnvKey || !newEnvValue}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        // Build env vars object from existing + new
                        const envObj = {};
                        envVars.forEach(e => { envObj[e.name] = e.value || ''; });
                        envObj[newEnvKey] = newEnvValue;
                        
                        await axios.put(`${API_BASE}/pods/${pod.name}/env`, 
                          { env_vars: envObj },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setNotification({ open: true, message: 'Environment variable added. Pod will restart.', severity: 'success' });
                        setShowEnvForm(false);
                        setNewEnvKey('');
                        setNewEnvValue('');
                        fetchEnvVars();
                      } catch (err) {
                        setNotification({ open: true, message: err.response?.data?.detail || 'Failed to add variable', severity: 'error' });
                      }
                      setActionLoading(false);
                    }}
                    sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
                  >
                    {actionLoading ? <CircularProgress size={18} /> : 'Save'}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => { setShowEnvForm(false); setNewEnvKey(''); setNewEnvValue(''); }}
                    sx={{ color: '#64748b' }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Existing Environment Variables */}
          {envVars.length > 0 ? (
            <Paper sx={{ bgcolor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 1 }}>
              <List dense>
                {envVars.map((env, index) => (
                  <ListItem key={index} divider sx={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}>
                    <ListItemText
                      primary={env.name}
                      secondary={env.value || '***hidden***'}
                      primaryTypographyProps={{ color: '#6366f1', fontFamily: 'monospace', fontWeight: 500 }}
                      secondaryTypographyProps={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    <IconButton 
                      size="small" 
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          // Remove this env var
                          const envObj = {};
                          envVars.forEach(e => { if (e.name !== env.name) envObj[e.name] = e.value || ''; });
                          
                          await axios.put(`${API_BASE}/pods/${pod.name}/env`, 
                            { env_vars: envObj },
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          setNotification({ open: true, message: 'Environment variable removed. Pod will restart.', severity: 'success' });
                          fetchEnvVars();
                        } catch (err) {
                          setNotification({ open: true, message: err.response?.data?.detail || 'Failed to remove variable', severity: 'error' });
                        }
                        setActionLoading(false);
                      }}
                      sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Alert severity="info" sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              No environment variables configured yet
            </Alert>
          )}
        </TabPanel>

        {/* Storage Tab - with Add Storage functionality */}
        <TabPanel value={activeTab} index={4}>
          {/* Add Storage Section */}
          {!pod?.has_storage && (
            <Paper sx={{ p: 2.5, mb: 2, bgcolor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 2 }}>
              {!showStorageForm ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                      Add Persistent Storage
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Attach persistent volume to keep your data safe
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowStorageForm(true)}
                    sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                  >
                    Add Storage
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#e2e8f0', mb: 2 }}>
                    Configure Storage
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel sx={{ color: '#94a3b8' }}>Size</InputLabel>
                      <Select
                        value={storageSize}
                        onChange={(e) => setStorageSize(e.target.value)}
                        label="Size"
                        sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99, 102, 241, 0.3)' } }}
                      >
                        <MenuItem value="1Gi">1 GB</MenuItem>
                        <MenuItem value="2Gi">2 GB</MenuItem>
                        <MenuItem value="5Gi">5 GB</MenuItem>
                        <MenuItem value="10Gi">10 GB</MenuItem>
                        <MenuItem value="20Gi">20 GB</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={actionLoading}
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          await axios.post(`${API_BASE}/pods/${pod.name}/storage`, { size: storageSize }, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          setNotification({ open: true, message: 'Storage added successfully', severity: 'success' });
                          setShowStorageForm(false);
                          fetchStorage();
                          if (onRefresh) onRefresh();
                        } catch (err) {
                          setNotification({ open: true, message: err.response?.data?.detail || 'Failed to add storage', severity: 'error' });
                        }
                        setActionLoading(false);
                      }}
                      sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                    >
                      {actionLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
                    </Button>
                    <Button size="small" onClick={() => setShowStorageForm(false)} sx={{ color: '#94a3b8' }}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          )}
          
          {/* Existing Storage List */}
          {storage.length > 0 || pod?.has_storage ? (
            <List>
              {pod?.has_storage && (
                <Paper sx={{ mb: 1, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2, border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon sx={{ color: '#10b981' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Persistent Volume - ${pod.storage_size || 'Active'}`}
                      secondary="ReadWriteOnce • Bound"
                      primaryTypographyProps={{ color: '#e2e8f0', fontWeight: 500 }}
                      secondaryTypographyProps={{ color: '#10b981' }}
                    />
                    <Chip label="Active" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }} />
                  </ListItem>
                </Paper>
              )}
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
              No storage volumes attached. Click "Add Storage" to attach persistent storage.
            </Alert>
          )}
          
          {/* Scaling Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScaleIcon sx={{ fontSize: 18 }} /> Auto-Scaling
            </Typography>
            {!pod?.has_autoscaling && !showScalingForm ? (
              <Paper sx={{ p: 2.5, bgcolor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 500 }}>
                      Enable Auto-Scaling
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Automatically scale pods based on CPU usage
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowScalingForm(true)}
                    sx={{ borderColor: '#fbbf24', color: '#fbbf24', '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(251, 191, 36, 0.1)' } }}
                  >
                    Configure
                  </Button>
                </Box>
              </Paper>
            ) : showScalingForm ? (
              <Paper sx={{ p: 2.5, bgcolor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      label="Min Replicas"
                      type="number"
                      size="small"
                      fullWidth
                      value={scalingConfig.min}
                      onChange={(e) => setScalingConfig(prev => ({ ...prev, min: parseInt(e.target.value) || 1 }))}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Max Replicas"
                      type="number"
                      size="small"
                      fullWidth
                      value={scalingConfig.max}
                      onChange={(e) => setScalingConfig(prev => ({ ...prev, max: parseInt(e.target.value) || 3 }))}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="CPU Threshold %"
                      type="number"
                      size="small"
                      fullWidth
                      value={scalingConfig.cpuThreshold}
                      onChange={(e) => setScalingConfig(prev => ({ ...prev, cpuThreshold: parseInt(e.target.value) || 70 }))}
                      inputProps={{ min: 10, max: 100 }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        await axios.post(`${API_BASE}/pods/${pod.name}/scaling`, {
                          min_replicas: scalingConfig.min,
                          max_replicas: scalingConfig.max,
                          cpu_threshold: scalingConfig.cpuThreshold
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        setNotification({ open: true, message: 'Auto-scaling configured successfully', severity: 'success' });
                        setShowScalingForm(false);
                        if (onRefresh) onRefresh();
                      } catch (err) {
                        setNotification({ open: true, message: err.response?.data?.detail || 'Failed to configure scaling', severity: 'error' });
                      }
                      setActionLoading(false);
                    }}
                    sx={{ bgcolor: '#fbbf24', color: '#000', '&:hover': { bgcolor: '#f59e0b' } }}
                  >
                    {actionLoading ? <CircularProgress size={16} /> : 'Enable Scaling'}
                  </Button>
                  <Button size="small" onClick={() => setShowScalingForm(false)} sx={{ color: '#94a3b8' }}>
                    Cancel
                  </Button>
                </Box>
              </Paper>
            ) : (
              <Paper sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip label="Active" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }} />
                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                      Replicas: {pod?.replicas || '1/3'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <Button onClick={onClose} sx={{ color: '#94a3b8' }}>
          Close
        </Button>
      </DialogActions>
      
      {/* Notification Snackbar inside modal */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

// ============================================
// ENHANCED CREATE POD MODAL
// With rich application catalog, search, and categories
// ============================================

const CreatePodModal = ({ open, onClose, onCreate, loading }) => {
  const theme = useTheme();
  const { colors } = useThemeContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State
  const [step, setStep] = useState(1); // 1: Select App, 2: Configure
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
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

  // Filter applications based on search and category
  const filteredApps = useMemo(() => {
    return APPLICATION_CATALOG.applications.filter(app => {
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.image.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Popular apps (shown at top when no filter)
  const popularApps = useMemo(() => {
    return APPLICATION_CATALOG.applications.filter(app => app.popular);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedCategory('all');
      setSearchQuery('');
      setSelectedApp(null);
      setPodData({
        name: '',
        image: '',
        port: '',
        replicas: 1,
        cpu_limit: '100m',
        memory_limit: '128Mi',
        env_vars: [],
      });
    }
  }, [open]);

  // Handle app selection
  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setPodData(prev => ({
      ...prev,
      image: app.image,
      port: app.port?.toString() || '',
      cpu_limit: app.resources?.cpu || '100m',
      memory_limit: app.resources?.memory || '128Mi',
      env_vars: app.env_defaults || [],
    }));
    
    if (!app.isCustom) {
      // Auto-generate name based on app
      const baseName = app.id.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      setPodData(prev => ({ ...prev, name: `${baseName}-${randomSuffix}` }));
    }
    
    setStep(2);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!podData.name || !podData.image) return;
    onCreate({
      ...podData,
      port: podData.port ? parseInt(podData.port) : undefined,
    });
  };

  // Environment variable helpers
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

  // Application Card Component
  const AppCard = ({ app }) => (
    <Card
      onClick={() => handleSelectApp(app)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: alpha(colors.bgElevated, 0.8),
        border: `1px solid ${colors.border}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: app.color || colors.primary,
          boxShadow: `0 8px 24px ${alpha(app.color || colors.primary, 0.2)}`,
        },
      }}
    >
      <CardContent sx={{ flex: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: alpha(app.color || colors.primary, 0.15),
              color: app.color || colors.primary,
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {app.name.substring(0, 2).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600, 
                  color: colors.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                {app.name}
              </Typography>
              {app.popular && (
                <Chip
                  label="Popular"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: alpha(colors.success, 0.15),
                    color: colors.success,
                  }}
                />
              )}
            </Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: colors.textSecondary,
                display: 'block',
              }}
            >
              {app.image || 'Custom image'}
            </Typography>
          </Box>
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            color: colors.textSecondary,
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        >
          {app.description}
        </Typography>
      </CardContent>
      {app.port && (
        <Box 
          sx={{ 
            px: 2, 
            py: 1, 
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            gap: 1,
          }}
        >
          <Chip 
            label={`Port ${app.port}`} 
            size="small"
            sx={{ 
              height: 20,
              fontSize: '0.7rem',
              bgcolor: alpha(colors.info, 0.1),
              color: colors.info,
            }}
          />
          {app.resources && (
            <Chip 
              label={app.resources.memory} 
              size="small"
              sx={{ 
                height: 20,
                fontSize: '0.7rem',
                bgcolor: alpha(colors.memory, 0.1),
                color: colors.memory,
              }}
            />
          )}
        </Box>
      )}
    </Card>
  );

  // Application List Item Component
  const AppListItem = ({ app }) => (
    <ListItem
      button
      onClick={() => handleSelectApp(app)}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        border: `1px solid ${colors.border}`,
        '&:hover': {
          bgcolor: alpha(colors.primary, 0.1),
          borderColor: app.color || colors.primary,
        },
      }}
    >
      <ListItemIcon>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: alpha(app.color || colors.primary, 0.15),
            color: app.color || colors.primary,
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          {app.name.substring(0, 2).toUpperCase()}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{app.name}</span>
            {app.popular && (
              <Chip
                label="Popular"
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  bgcolor: alpha(colors.success, 0.15),
                  color: colors.success,
                }}
              />
            )}
          </Box>
        }
        secondary={app.description}
        primaryTypographyProps={{ fontWeight: 500, color: colors.textPrimary }}
        secondaryTypographyProps={{ fontSize: '0.75rem' }}
      />
      <Chip 
        label={app.image || 'Custom'} 
        size="small"
        sx={{ 
          maxWidth: 120,
          fontSize: '0.7rem',
          bgcolor: alpha(colors.bgDefault, 0.5),
        }}
      />
    </ListItem>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: colors.bgPaper,
          backgroundImage: 'none',
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          maxHeight: '85vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: `1px solid ${colors.border}`,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: alpha(colors.primary, 0.15), color: colors.primary }}>
            <AddIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 600 }}>
              {step === 1 ? 'Select Application' : 'Configure Deployment'}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              {step === 1 
                ? 'Choose from our catalog or deploy a custom image' 
                : `Deploying ${selectedApp?.name || 'Custom Application'}`
              }
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: colors.textSecondary }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Step 1: Application Selection */}
        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: 500 }}>
            {/* Category Sidebar */}
            <Box
              sx={{
                width: isMobile ? '100%' : 200,
                borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
                borderBottom: isMobile ? `1px solid ${colors.border}` : 'none',
                p: 2,
                overflowY: 'auto',
              }}
            >
              <Typography variant="overline" sx={{ color: colors.textSecondary, px: 1 }}>
                Categories
              </Typography>
              <List dense sx={{ py: 1 }}>
                {APPLICATION_CATALOG.categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const count = cat.id === 'all' 
                    ? APPLICATION_CATALOG.applications.length 
                    : APPLICATION_CATALOG.applications.filter(a => a.category === cat.id).length;
                  
                  return (
                    <ListItem
                      key={cat.id}
                      button
                      selected={isSelected}
                      onClick={() => setSelectedCategory(cat.id)}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.5,
                        py: 0.75,
                        '&.Mui-selected': {
                          bgcolor: alpha(colors.primary, 0.15),
                          '&:hover': { bgcolor: alpha(colors.primary, 0.2) },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Icon 
                          fontSize="small" 
                          sx={{ color: isSelected ? colors.primary : colors.textSecondary }} 
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={cat.name}
                        primaryTypographyProps={{
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? colors.textPrimary : colors.textSecondary,
                        }}
                      />
                      <Chip
                        label={count}
                        size="small"
                        sx={{
                          height: 20,
                          minWidth: 24,
                          fontSize: '0.7rem',
                          bgcolor: alpha(colors.bgDefault, 0.5),
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>

            {/* Application Grid */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Search and View Toggle */}
              <Box 
                sx={{ 
                  p: 2, 
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ flex: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: colors.textSecondary }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, v) => v && setViewMode(v)}
                  size="small"
                >
                  <ToggleButton value="grid">
                    <ViewModuleIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="list">
                    <ViewListIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Applications List/Grid */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {/* Popular Apps Section (only when no filter) */}
                {selectedCategory === 'all' && !searchQuery && (
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        color: colors.textSecondary, 
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <CheckCircleIcon fontSize="small" sx={{ color: colors.success }} />
                      Popular Applications
                    </Typography>
                    <Grid container spacing={2}>
                      {popularApps.slice(0, 4).map((app) => (
                        <Grid item xs={12} sm={6} md={3} key={app.id}>
                          <AppCard app={app} />
                        </Grid>
                      ))}
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                  </Box>
                )}

                {/* All Filtered Apps */}
                {viewMode === 'grid' ? (
                  <Grid container spacing={2}>
                    {filteredApps.map((app) => (
                      <Grid item xs={12} sm={6} md={4} key={app.id}>
                        <AppCard app={app} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <List>
                    {filteredApps.map((app) => (
                      <AppListItem key={app.id} app={app} />
                    ))}
                  </List>
                )}

                {filteredApps.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No applications found matching "{searchQuery}"
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <Box sx={{ p: 3 }}>
            {/* Selected App Info */}
            {selectedApp && !selectedApp.isCustom && (
              <Paper 
                sx={{ 
                  p: 2, 
                  mb: 3, 
                  bgcolor: alpha(selectedApp.color || colors.primary, 0.1),
                  border: `1px solid ${alpha(selectedApp.color || colors.primary, 0.3)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: alpha(selectedApp.color || colors.primary, 0.2),
                      color: selectedApp.color || colors.primary,
                      fontWeight: 700,
                    }}
                  >
                    {selectedApp.name.substring(0, 2).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedApp.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedApp.description}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pod Name"
                  value={podData.name}
                  onChange={(e) => setPodData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="my-app"
                  helperText="Lowercase letters, numbers, and hyphens only"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Docker Image"
                  value={podData.image}
                  onChange={(e) => setPodData(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="nginx:latest"
                  disabled={selectedApp && !selectedApp.isCustom}
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
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Replicas"
                  type="number"
                  value={podData.replicas}
                  onChange={(e) => setPodData(prev => ({ ...prev, replicas: parseInt(e.target.value) || 1 }))}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="CPU Limit"
                  value={podData.cpu_limit}
                  onChange={(e) => setPodData(prev => ({ ...prev, cpu_limit: e.target.value }))}
                  placeholder="100m"
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Memory Limit"
                  value={podData.memory_limit}
                  onChange={(e) => setPodData(prev => ({ ...prev, memory_limit: e.target.value }))}
                  placeholder="128Mi"
                />
              </Grid>

              {/* Environment Variables */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 1 }}>
                  Environment Variables
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="NAME"
                    value={newEnvVar.name}
                    onChange={(e) => setNewEnvVar(prev => ({ ...prev, name: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    placeholder="VALUE"
                    value={newEnvVar.value}
                    onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <IconButton onClick={addEnvVar} sx={{ color: colors.primary }}>
                    <AddIcon />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {podData.env_vars.map((env, index) => (
                    <Chip
                      key={index}
                      label={`${env.name}=${env.value}`}
                      onDelete={() => removeEnvVar(index)}
                      size="small"
                      sx={{
                        bgcolor: alpha(colors.primary, 0.15),
                        color: colors.primary,
                      }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions 
        sx={{ 
          p: 2, 
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          {step === 2 && (
            <Button 
              onClick={() => setStep(1)} 
              startIcon={<ExpandLessIcon sx={{ transform: 'rotate(-90deg)' }} />}
            >
              Back to Catalog
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} sx={{ color: colors.textSecondary }}>
            Cancel
          </Button>
          {step === 2 && (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !podData.name || !podData.image}
              startIcon={loading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
            >
              Deploy
            </Button>
          )}
        </Box>
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPod, setSelectedPod] = useState(null);
  
  // Data State
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eusuitePods, setEusuitePods] = useState([]);
  const [eusuiteDeployed, setEusuiteDeployed] = useState(false);
  
  // Action State
  const [actionLoading, setActionLoading] = useState({});
  
  // Notification State
  const { notification, showNotification, hideNotification } = useNotification();

  // Logout handler - MUST be defined before fetchPods uses it
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('company');
    navigate('/login');
  }, [navigate]);

  // Fetch pods with detailed logging
  const fetchPods = useCallback(async () => {
    if (!token) {
      console.log('[Dashboard] No token found, redirecting to login');
      navigate('/login');
      return;
    }
    
    console.log('[Dashboard] Fetching pods...');
    
    try {
      const response = await axios.get(`${API_BASE}/pods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('[Dashboard] API Response:', response.data);
      
      // Handle both { pods: [...] } and [...] response structures
      const allPods = Array.isArray(response.data) 
        ? response.data 
        : (response.data.pods || []);
      
      console.log('[Dashboard] Parsed pods array:', allPods);
      console.log('[Dashboard] Number of pods:', allPods.length);
      
      // Separate EUSUITE pods
      const euPods = allPods.filter(p => 
        p.name?.startsWith('eusuite-') || 
        p.name?.startsWith('eumail-') || 
        p.name?.startsWith('eucloud-') || 
        p.name?.startsWith('eutype-') || 
        p.name?.startsWith('eugroups-') || 
        p.name?.startsWith('euadmin-')
      );
      const regularPods = allPods.filter(p => 
        !p.name?.startsWith('eusuite-') && 
        !p.name?.startsWith('eumail-') && 
        !p.name?.startsWith('eucloud-') && 
        !p.name?.startsWith('eutype-') && 
        !p.name?.startsWith('eugroups-') && 
        !p.name?.startsWith('euadmin-')
      );
      
      console.log('[Dashboard] Regular pods:', regularPods.length);
      console.log('[Dashboard] EUSUITE pods:', euPods.length);
      
      setPods(regularPods);
      setEusuitePods(euPods);
      setEusuiteDeployed(euPods.length > 0);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('[Dashboard] Error fetching pods:', err);
      console.error('[Dashboard] Error response:', err.response?.data);
      
      if (err.response?.status === 401) {
        console.log('[Dashboard] 401 Unauthorized, logging out');
        handleLogout();
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch pods');
      }
      setLoading(false);
    }
  }, [token, navigate, handleLogout]);

  // Polling for pods - every 5 seconds, skip initial since useEffect handles it
  usePolling(fetchPods, 5000, { enabled: !!token, skipInitial: true });

  // Initial fetch
  useEffect(() => {
    console.log('[Dashboard] Component mounted, token:', !!token);
    if (token) {
      fetchPods();
    } else {
      navigate('/login');
    }
  }, [token, navigate, fetchPods]);

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

  // Retry handler for error state
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchPods();
  };

  // Loading Skeleton Component
  const LoadingSkeleton = () => (
    <Grid container spacing={2}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid item xs={12} sm={6} lg={4} xl={3} key={i}>
          <Card sx={{ 
            height: 200, 
            bgcolor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 3,
          }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)' }} />
              <Skeleton variant="text" width="40%" height={24} sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', mt: 1 }} />
              <Skeleton variant="rectangular" height={60} sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', mt: 2, borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Action buttons for the AppBar
  const actionButtons = (
    <>
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
    </>
  );

  return (
    <MainLayout title="Pod Management" actions={actionButtons}>
      {/* Error State */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              startIcon={<ReplayIcon />}
              onClick={handleRetry}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box>
          <Typography variant="h6" sx={{ color: '#94a3b8', mb: 2, fontWeight: 500 }}>
            Loading pods...
          </Typography>
          <LoadingSkeleton />
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
                <AppsIcon sx={{ fontSize: 48, color: '#64748b', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#94a3b8', mb: 1 }}>
                  No pods deployed yet
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                  Click "New Pod" to deploy your first application
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateModalOpen(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    },
                  }}
                >
                  Deploy Your First Pod
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {pods.map((pod) => (
                  <Grid item xs={12} sm={6} lg={4} xl={3} key={pod.id || pod.name}>
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
    </MainLayout>
  );
}
