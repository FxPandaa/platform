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
  Fade,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
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
        setSnackbar({ open: true, message: `Company "${item.name}" deleted successfully`, severity: 'success' });
      } else if (type === 'user') {
        await axios.delete(`${BACKEND_URL}/admin/users/${item.id}`, { headers });
        setSnackbar({ open: true, message: `User "${item.username}" deleted successfully`, severity: 'success' });
      }
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.detail || 'Delete failed', severity: 'error' });
    }
    setDeleteDialog({ open: false, type: null, item: null });
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 40px ${color}20`,
          borderColor: `${color}30`
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, color: color, mb: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 28, color: color }} />
        </Box>
      </Box>
    </Paper>
  );

  if (loading && !stats) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <CircularProgress sx={{ color: '#f59e0b' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 4 }}>
      {/* Header */}
      <Fade in timeout={600}>
        <Paper
          sx={{
            p: 3,
            mb: 4,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)'
                }}
              >
                <AdminPanelSettingsIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                  Admin Portal
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Platform Management Dashboard
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Refresh Data">
                <IconButton onClick={fetchData} sx={{ color: 'text.secondary' }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  color: '#f59e0b',
                  '&:hover': {
                    borderColor: '#f59e0b',
                    bgcolor: 'rgba(245, 158, 11, 0.1)'
                  }
                }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Paper>
      </Fade>

      {/* Stats Cards */}
      <Fade in timeout={800}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={BusinessIcon}
              title="Total Companies"
              value={stats?.total_companies || 0}
              color="#6366f1"
              subtitle="Active organizations"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={PeopleIcon}
              title="Total Users"
              value={stats?.total_users || 0}
              color="#10b981"
              subtitle="Registered accounts"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={ViewInArIcon}
              title="Total Pods"
              value={stats?.total_pods || 0}
              color="#3b82f6"
              subtitle={`${stats?.total_deployments || 0} deployments`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={AttachMoneyIcon}
              title="Monthly Revenue"
              value={`€${stats?.estimated_monthly_revenue || 0}`}
              color="#f59e0b"
              subtitle="Estimated billing"
            />
          </Grid>
        </Grid>
      </Fade>

      {/* Tabs */}
      <Fade in timeout={1000}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(e, v) => setActiveTab(v)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 64
                },
                '& .Mui-selected': {
                  color: '#f59e0b !important'
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#f59e0b'
                }
              }}
            >
              <Tab icon={<BusinessIcon />} iconPosition="start" label="Companies" />
              <Tab icon={<PeopleIcon />} iconPosition="start" label="Users" />
            </Tabs>
          </Box>

          {/* Companies Tab */}
          {activeTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Company Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Namespace</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Users</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Pods</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Deployments</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Monthly Cost</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          No companies registered yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company) => (
                      <TableRow key={company.name} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {company.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={company.namespace}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1',
                              fontFamily: 'monospace'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={company.users.length}
                            size="small"
                            sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                          />
                        </TableCell>
                        <TableCell>{company.pod_count}</TableCell>
                        <TableCell>{company.deployment_count}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                            €{company.monthly_cost.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Delete Company">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, type: 'company', item: company })}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Users Tab */}
          {activeTab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          No users registered yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Chip
                            label={`#${user.id}`}
                            size="small"
                            sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PeopleIcon sx={{ fontSize: 20, color: '#10b981' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user.username}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.company_name}
                            size="small"
                            icon={<BusinessIcon sx={{ fontSize: '16px !important' }} />}
                            sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteDialog({ open: true, type: 'user', item: user })}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Fade>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: null, item: null })}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ color: 'warning.main' }} />
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            {deleteDialog.type === 'company' ? (
              <>
                Are you sure you want to delete company <strong>"{deleteDialog.item?.name}"</strong>?
                <br /><br />
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This will delete all users, pods, deployments, and Kubernetes namespace associated with this company.
                </Alert>
              </>
            ) : (
              <>
                Are you sure you want to delete user <strong>"{deleteDialog.item?.username}"</strong> from company <strong>"{deleteDialog.item?.company_name}"</strong>?
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, type: null, item: null })}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminDashboard;
