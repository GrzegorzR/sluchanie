import React from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActionArea, Divider } from '@mui/material';
import { 
  People as UsersIcon, 
  LibraryMusic as RecordsIcon, 
  History as SelectionsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Manage Users',
      description: 'Add, edit, or delete user accounts',
      icon: <UsersIcon sx={{ fontSize: 40 }} />,
      path: '/admin/users'
    },
    {
      title: 'Manage Records',
      description: 'View and manage record collection',
      icon: <RecordsIcon sx={{ fontSize: 40 }} />,
      path: '/admin/records'
    },
    {
      title: 'View Selections',
      description: 'View selection history',
      icon: <SelectionsIcon sx={{ fontSize: 40 }} />,
      path: '/admin/selections'
    }
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to the administration panel. Here you can manage all aspects of the application.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      <Grid container spacing={3}>
        {adminModules.map((module, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardActionArea 
                sx={{ height: '100%' }}
                onClick={() => navigate(module.path)}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ mb: 2, color: 'primary.main' }}>
                    {module.icon}
                  </Box>
                  <Typography gutterBottom variant="h5" component="h2">
                    {module.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {module.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdminDashboard; 