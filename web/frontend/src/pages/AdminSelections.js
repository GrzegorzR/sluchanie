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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  CalendarMonth as CalendarIcon,
  Sort as SortIcon,
  Grade as GradeIcon,
} from '@mui/icons-material';
import axios from 'axios';
import AuthService from '../services/AuthService';

// The API_URL contains '/api/v1' but admin endpoints are directly at '/admin'
const BASE_URL = process.env.REACT_APP_API_URL.replace('/api/v1', '');
const ADMIN_API_URL = `${BASE_URL}/admin`;

const AdminSelections = () => {
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'rating'

  useEffect(() => {
    fetchSelections();
  }, [sortBy]);

  const fetchSelections = async () => {
    try {
      setLoading(true);
      const sortByRating = sortBy === 'rating';
      const response = await axios.get(`${ADMIN_API_URL}/selections/api`, {
        headers: { ...AuthService.getAuthHeader() },
        params: { sort_by_rating: sortByRating }
      });
      setSelections(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching selections:', err);
      setError('Failed to load selection history');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Selection History (Admin View)
        </Typography>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="sort-by-label">Sort By</InputLabel>
          <Select
            labelId="sort-by-label"
            id="sort-by"
            value={sortBy}
            label="Sort By"
            onChange={handleSortChange}
            startAdornment={<SortIcon fontSize="small" sx={{ mr: 1 }} />}
          >
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="rating">Rating</MenuItem>
          </Select>
        </FormControl>
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
          {selections.length > 0 ? (
            <TableContainer>
              <Table aria-label="selection history table">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Chosen User</TableCell>
                    <TableCell>Record</TableCell>
                    <TableCell>Selected By</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Participants</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selections.map((selection) => (
                    <TableRow key={selection.id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                      <TableCell>{selection.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          {formatDate(selection.timestamp)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body2">
                            {selection.chosen_user?.username || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <MusicNoteIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                          <Typography variant="body2">
                            {selection.record ? `${selection.record.artist} - ${selection.record.title}` : 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {selection.selector?.username || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {selection.average_rating !== null ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2">
                              {selection.average_rating.toFixed(2)}
                            </Typography>
                            <GradeIcon fontSize="small" sx={{ ml: 0.5, color: '#faaf00' }} />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              ({selection.ratings_count})
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No ratings
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {selection.participants && (
                          <Chip
                            size="small"
                            label={`${selection.participants.split(',').length} participants`}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No selection history available
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default AdminSelections; 