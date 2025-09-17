import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Snackbar,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import AuthService from '../services/AuthService';

// The API_URL contains '/api/v1' but admin endpoints are directly at '/admin'
const BASE_URL = process.env.REACT_APP_API_URL.replace('/api/v1', '');
const ADMIN_API_URL = `${BASE_URL}/admin`;

const AdminRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({ title: '', artist: '', cover_url: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${ADMIN_API_URL}/records/api`, {
        headers: { ...AuthService.getAuthHeader() }
      });
      setRecords(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Failed to load records');
      setLoading(false);
    }
  };

  // Handle form input change (Added)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Open edit record dialog (Added)
  const handleEditClick = (record) => {
    setSelectedRecord(record);
    // Assuming record has 'title' and 'artist' fields. Add others if needed.
    setFormData({ title: record.title, artist: record.artist, cover_url: record.cover_url });
    setOpenEditDialog(true);
  };

  // Update record (Added)
  const handleUpdateRecord = async () => {
    if (!selectedRecord) return;
    
    // Check if token might be expired
    if (AuthService.isTokenExpired()) {
      setSnackbar({
        open: true,
        message: 'Your session may have expired. Please log in again.',
        severity: 'warning'
      });
      // You could also redirect to login page if needed:
      // window.location.href = '/login';
      return;
    }
    
    try {
      // Log the auth headers for debugging
      console.log('Auth headers:', AuthService.getAuthHeader());
      
      // Make the API request with explicit headers
      await axios.put(
        `${ADMIN_API_URL}/records/api/${selectedRecord.id}`, 
        formData, 
        {
          headers: { 
            ...AuthService.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      setOpenEditDialog(false);
      fetchRecords(); // Refresh records list
      setSnackbar({
        open: true,
        message: 'Record updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating record:', error);
      // Log more detailed error information
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to update record',
        severity: 'error'
      });
    }
  };

  // Close snackbar (Added)
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Records Management (Admin View)
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Paper elevation={3} sx={{ p: 3 }}>
          {records.length > 0 ? (
            <TableContainer>
              <Table aria-label="records table">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Artist</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                      <TableCell>{record.id}</TableCell>
                      <TableCell>{record.title}</TableCell>
                      <TableCell>{record.artist}</TableCell>
                      <TableCell>{record.owner_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={record.used ? 'Used' : 'Available'}
                          color={record.used ? 'secondary' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleEditClick(record)}
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No records available
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Edit Record Dialog (Added) */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Record</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="title"
            label="Title"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={handleInputChange}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            name="artist"
            label="Artist"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.artist}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="cover_url"
            label="Cover URL"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.cover_url}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          {/* Add other fields for editing here as needed, e.g., for 'used' status */}
          {/* For example, a Checkbox for the 'used' status:
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.used} // Ensure formData has a 'used' field
                onChange={handleInputChange} // Adjust handleInputChange for checkboxes
                name="used"
              />
            }
            label="Used"
          />
          */}
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateRecord} variant="contained" color="primary">
            Update Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications (Added) */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminRecords; 