import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ApiService from '../services/ApiService';

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getSelectionStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data from stats
  const getUserDistributionData = () => {
    if (!stats || !stats.user_distribution) return null;

    const labels = Object.keys(stats.user_distribution);
    const data = labels.map(name => parseFloat(stats.user_distribution[name].replace('%', '')));
    
    return {
      labels,
      datasets: [
        {
          label: 'Selection Percentage',
          data,
          backgroundColor: [
            'rgba(93, 64, 55, 0.8)',
            'rgba(156, 39, 176, 0.8)',
            'rgba(33, 150, 243, 0.8)',
            'rgba(76, 175, 80, 0.8)',
            'rgba(255, 152, 0, 0.8)',
            'rgba(244, 67, 54, 0.8)',
            'rgba(121, 85, 72, 0.8)',
            'rgba(63, 81, 181, 0.8)',
          ],
          borderColor: [
            'rgba(93, 64, 55, 1)',
            'rgba(156, 39, 176, 1)',
            'rgba(33, 150, 243, 1)',
            'rgba(76, 175, 80, 1)',
            'rgba(255, 152, 0, 1)',
            'rgba(244, 67, 54, 1)',
            'rgba(121, 85, 72, 1)',
            'rgba(63, 81, 181, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const userDistributionData = getUserDistributionData();

  // Chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 15,
          padding: 10,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'User Selection Distribution',
        font: {
          size: 14
        }
      },
    },
  };

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 3 }}>
      <Typography variant="h4" gutterBottom>
        Statistics
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
          {/* Overview */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="primary">
                        {stats.total_selections || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Selections
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="secondary">
                        {Object.keys(stats.user_distribution || {}).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unique Users
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="info.main">
                        {Object.keys(stats.record_distribution || {}).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unique Records
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Distribution Charts */}
          {stats && stats.total_selections > 0 ? (
            <>
              {/* User Distribution */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    User Distribution
                  </Typography>
                  <Box sx={{ 
                    height: 250, 
                    display: 'flex', 
                    justifyContent: 'center',
                    maxWidth: '600px',
                    margin: '0 auto'
                  }}>
                    {userDistributionData && <Pie data={userDistributionData} options={pieOptions} />}
                  </Box>
                </Paper>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No Selection Data Available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Start making selections to generate statistics
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default Statistics; 