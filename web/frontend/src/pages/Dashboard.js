import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  BarChart as BarChartIcon,
  History as HistoryIcon,
  Casino as CasinoIcon,
} from '@mui/icons-material';
import ApiService from '../services/ApiService';

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState({ available: 0, used: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, statsData, allRecordsData, usedRecordsData] = await Promise.all([
        ApiService.getPersons(), // Still using getPersons API but it now returns users
        ApiService.getSelectionStats(),
        ApiService.getAllRecords(),
        ApiService.getRecordHistory(),
      ]);
      setUsers(usersData);
      setStats(statsData);
      setRecords({
        available: allRecordsData.length,
        used: usedRecordsData.length
      });
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Stats Summary */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Selection Statistics
              </Typography>
              {stats && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h3" align="center" color="primary">
                          {stats.total_selections || 0}
                        </Typography>
                        <Typography variant="body2" align="center" color="text.secondary">
                          Total Selections
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h3" align="center" color="secondary">
                          {records.available}
                        </Typography>
                        <Typography variant="body2" align="center" color="text.secondary">
                          Available Records
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h3" align="center" color="success.main">
                          {records.used}
                        </Typography>
                        <Typography variant="body2" align="center" color="text.secondary">
                          Used Records
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Recent Distribution
                        </Typography>
                        {stats.user_distribution && Object.keys(stats.user_distribution).length > 0 ? (
                          <List dense>
                            {Object.entries(stats.user_distribution)
                              .slice(0, 5)
                              .map(([name, percentage]) => (
                                <ListItem key={name}>
                                  <ListItemIcon sx={{ minWidth: 32 }}>
                                    <PersonIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={name}
                                    secondary={`Selection rate: ${percentage}`}
                                  />
                                </ListItem>
                              ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No selection data available yet
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* Users section */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Users ({users.length})
                </Typography>
                <Box>
                  <Button variant="outlined" size="small" component={Link} to="/records" sx={{ mr: 1 }}>
                    Manage Records
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    component={Link} 
                    to="/records" 
                    startIcon={<HistoryIcon />}
                    onClick={() => {
                      // This function runs after navigation, so we need a way to set the right tab
                      // Setting a sessionStorage flag is one approach
                      sessionStorage.setItem('activeRecordTab', '3');
                    }}
                  >
                    View History
                  </Button>
                </Box>
              </Box>
              
              {users.length > 0 ? (
                <Grid container spacing={2}>
                  {users.slice(0, 6).map((user) => (
                    <Grid item xs={12} sm={6} key={user.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" component="div">
                            {user.username}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <BarChartIcon fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Weight: {user.weight}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No users found
                </Typography>
              )}
              
              {users.length > 6 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button variant="text" component={Link} to="/records">
                    View All
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card variant="outlined" className="record-card">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CasinoIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                        <Typography variant="h6">
                          Start Selection
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Pick a user and record using our balanced algorithm
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        component={Link} 
                        to="/selection"
                        variant="contained" 
                        fullWidth
                      >
                        Go to Selection
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card variant="outlined" className="record-card">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <HistoryIcon sx={{ fontSize: 40, mr: 2, color: 'secondary.main' }} />
                        <Typography variant="h6">
                          View History
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Review past selections and their results
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        component={Link} 
                        to="/history"
                        variant="outlined" 
                        fullWidth
                      >
                        View History
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard; 