import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  ViewInAr as PodIcon,
  Euro as EuroIcon,
  Delete as DeleteIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = '#6366f1' }) => (
  <Card
    elevation={0}
    sx={{
      height: '100%',
      bgcolor: '#1e293b',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 2,
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: 'rgba(255,255,255,0.12)',
        transform: 'translateY(-2px)',
      }
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 22, color: color }} />
        </Box>
        {trend && (
          <Chip
            size="small"
            icon={<TrendingUpIcon sx={{ fontSize: '14px !important' }} />}
            label={trend}
            sx={{
              height: 22,
              bgcolor: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              fontSize: '0.7rem',
              '& .MuiChip-icon': { color: '#22c55e' }
            }}
          />
        )}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: '#f1f5f9', mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// Company Row Component
const CompanyRow = ({ company, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <TableRow 
      sx={{ 
        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
        '& td': { borderColor: 'rgba(255,255,255,0.04)' }
      }}
    >
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: '#6366f115',
              color: '#6366f1',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {company.name.substring(0, 2).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f5f9' }}>
              {company.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {company.namespace}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={company.users.length}
          size="small"
          sx={{ bgcolor: '#10b98115', color: '#10b981', fontWeight: 600, minWidth: 32 }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
          {company.pod_count}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
          {company.deployment_count}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>
          €{company.monthly_cost.toFixed(2)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreIcon sx={{ color: '#64748b', fontSize: 20 }} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: { bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, minWidth: 160 }
          }}
        >
          <MenuItem 
            onClick={() => { setAnchorEl(null); onDelete(company); }}
            sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
          >
            <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
};

// User Row Component  
const UserRow = ({ user, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <TableRow 
      sx={{ 
        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
        '& td': { borderColor: 'rgba(255,255,255,0.04)' }
      }}
    >
      <TableCell>
        <Chip label={`#${user.id}`} size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', fontFamily: 'monospace' }} />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#10b98115', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
            {user.username.substring(0, 2).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#f1f5f9' }}>
            {user.username}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          icon={<BusinessIcon sx={{ fontSize: '14px !important' }} />}
          label={user.company_name}
          size="small"
          sx={{ bgcolor: '#6366f115', color: '#a5b4fc', '& .MuiChip-icon': { color: '#6366f1' } }}
        />
      </TableCell>
      <TableCell align="right">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreIcon sx={{ color: '#64748b', fontSize: 20 }} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: { bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, minWidth: 160 }
          }}
        >
          <MenuItem 
            onClick={() => { setAnchorEl(null); onDelete(user); }}
            sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
          >
            <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, item: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, companiesRes, usersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/admin/stats`, { headers }),
        axios.get(`${BACKEND_URL}/admin/companies`, { headers }),
        axios.get(`${BACKEND_URL}/admin/users`, { headers })
      ]);
      setStats(statsRes.data);
      setCompanies(companiesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        setSnackbar({ open: true, message: 'Session expired. Please login again.', severity: 'error' });
        handleLogout();
      } else {
        setSnackbar({ open: true, message: 'Failed to fetch data', severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchData();
  }, [fetchData, navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  const handleDelete = async () => {
    const { type, item } = deleteDialog;
    try {
      if (type === 'company') {
        await axios.delete(`${BACKEND_URL}/admin/companies/${encodeURIComponent(item.name)}`, { headers });
        setSnackbar({ open: true, message: `Company "${item.name}" deleted`, severity: 'success' });
      } else if (type === 'user') {
        await axios.delete(`${BACKEND_URL}/admin/users/${item.id}`, { headers });
        setSnackbar({ open: true, message: `User "${item.username}" deleted`, severity: 'success' });
      }
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.detail || 'Delete failed', severity: 'error' });
    }
    setDeleteDialog({ open: false, type: null, item: null });
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.namespace.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !stats) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a', flexDirection: 'column', gap: 2 }}>
        <CircularProgress sx={{ color: '#f59e0b' }} size={40} />
        <Typography variant="body2" sx={{ color: '#64748b' }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a' }}>
      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 1000 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AdminIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f1f5f9', lineHeight: 1.2 }}>Admin Dashboard</Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>Platform Management</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchData} sx={{ color: '#64748b' }}><RefreshIcon /></IconButton>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<LogoutIcon />} onClick={handleLogout}
              sx={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', textTransform: 'none', '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' } }}>
              Sign out
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <StatCard icon={BusinessIcon} title="Companies" value={stats?.total_companies || 0} subtitle="Registered organizations" color="#6366f1" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard icon={PeopleIcon} title="Users" value={stats?.total_users || 0} subtitle="Active accounts" color="#10b981" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard icon={PodIcon} title="Pods" value={stats?.total_pods || 0} subtitle={`${stats?.total_deployments || 0} deployments`} color="#3b82f6" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard icon={EuroIcon} title="Revenue" value={`€${stats?.estimated_monthly_revenue || 0}`} subtitle="Monthly estimate" color="#f59e0b" trend="+12%" />
          </Grid>
        </Grid>

        {/* Data Tables Card */}
        <Card elevation={0} sx={{ bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}
              sx={{ minHeight: 36, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, minHeight: 36, px: 2, color: '#64748b' }, '& .Mui-selected': { color: '#f59e0b !important' }, '& .MuiTabs-indicator': { bgcolor: '#f59e0b', height: 2 } }}>
              <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><BusinessIcon sx={{ fontSize: 18 }} />Companies<Chip label={companies.length} size="small" sx={{ height: 20, bgcolor: '#f59e0b20', color: '#f59e0b' }} /></Box>} />
              <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PeopleIcon sx={{ fontSize: 18 }} />Users<Chip label={users.length} size="small" sx={{ height: 20, bgcolor: '#f59e0b20', color: '#f59e0b' }} /></Box>} />
            </Tabs>
            <TextField size="small" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 240, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(15, 23, 42, 0.5)', '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment> }} />
          </Box>

          {loading && <LinearProgress sx={{ bgcolor: '#f59e0b20', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }} />}

          {activeTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.04)', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' } }}>
                    <TableCell>Company</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Pods</TableCell>
                    <TableCell>Deployments</TableCell>
                    <TableCell>Monthly Cost</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCompanies.length === 0 ? (
                    <TableRow><TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', borderBottom: 'none' }}><Typography variant="body2" sx={{ color: '#64748b' }}>{searchQuery ? 'No companies match your search' : 'No companies registered yet'}</Typography></TableCell></TableRow>
                  ) : (
                    filteredCompanies.map((company) => <CompanyRow key={company.name} company={company} onDelete={(c) => setDeleteDialog({ open: true, type: 'company', item: c })} />)
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.04)', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' } }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} sx={{ py: 6, textAlign: 'center', borderBottom: 'none' }}><Typography variant="body2" sx={{ color: '#64748b' }}>{searchQuery ? 'No users match your search' : 'No users registered yet'}</Typography></TableCell></TableRow>
                  ) : (
                    filteredUsers.map((user) => <UserRow key={user.id} user={user} onDelete={(u) => setDeleteDialog({ open: true, type: 'user', item: u })} />)
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Box>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: null, item: null })}
        PaperProps={{ sx: { bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, maxWidth: 400 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: '#ef4444' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Confirm Delete</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            {deleteDialog.type === 'company' ? (
              <>Delete company <strong style={{ color: '#f1f5f9' }}>"{deleteDialog.item?.name}"</strong>?
                <Alert severity="warning" sx={{ mt: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  This will delete all users, pods, deployments, and the Kubernetes namespace.
                </Alert>
              </>
            ) : (
              <>Delete user <strong style={{ color: '#f1f5f9' }}>"{deleteDialog.item?.username}"</strong> from <strong style={{ color: '#f1f5f9' }}>"{deleteDialog.item?.company_name}"</strong>?</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button onClick={() => setDeleteDialog({ open: false, type: null, item: null })} sx={{ color: '#94a3b8', textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ bgcolor: '#ef4444', textTransform: 'none', '&:hover': { bgcolor: '#dc2626' } }} startIcon={<DeleteIcon />}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminDashboard;
