import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  FormControlLabel,
  Tooltip,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Avatar,
  IconButton,
  Collapse,
  TableSortLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  CalendarMonth as CalendarIcon,
  FilterAlt as FilterIcon,
  Sort as SortIcon,
  Album as AlbumIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import RatingEditDialog from '../components/RatingEditDialog';

// --- START ADDING SORTING HELPERS ---
// Helper function for stable sorting
function descendingComparator(a, b, orderBy, currentUserId) {
  let bValue = b[orderBy];
  let aValue = a[orderBy];

  // Handle specific sorting logic
  if (orderBy === 'my_rating') {
    bValue = getMyRating(b, currentUserId);
    aValue = getMyRating(a, currentUserId);
  } else if (orderBy === 'username') { // Assuming sorting by chosen_user username
    bValue = b.chosen_user?.username?.toLowerCase() || '';
    aValue = a.chosen_user?.username?.toLowerCase() || '';
  } else if (orderBy === 'record') { // Assuming sorting by record title
    bValue = b.record?.title?.toLowerCase() || '';
    aValue = a.record?.title?.toLowerCase() || '';
  } else if (orderBy === 'average_rating') {
    bValue = b.average_rating ?? -1; // Treat null/undefined as lowest
    aValue = a.average_rating ?? -1;
  } else if (orderBy === 'date') {
    // Timestamps are already comparable
    bValue = b.timestamp;
    aValue = a.timestamp;
  }

  // Default numeric comparison for other potential fields
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    // Standard numeric comparison
  } else if (typeof aValue === 'string' && typeof bValue === 'string') {
    // Standard string comparison if not handled above
    bValue = bValue.toLowerCase();
    aValue = aValue.toLowerCase();
  } else {
    // Fallback for mixed types or unhandled cases
    bValue = String(bValue);
    aValue = String(aValue);
  }

  if (bValue < aValue) {
    return -1;
  }
  if (bValue > aValue) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy, currentUserId) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy, currentUserId)
    : (a, b) => -descendingComparator(a, b, orderBy, currentUserId);
}

// Stable sort implementation
function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1]; // Maintain original order if values are equal
  });
  return stabilizedThis.map((el) => el[0]);
}

// Helper function to get user's rating
function getMyRating(item, currentUserId) {
    if (!item || !item.ratings || !currentUserId) return -1; 
    const userRatingObj = item.ratings.find(r => r.user_id === currentUserId);
    return userRatingObj ? userRatingObj.rating : -1; 
}
// --- END ADDING SORTING HELPERS ---

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSelection, setEditingSelection] = useState(null);
  const [order, setOrder] = useState('desc'); // Default to descending for date
  const [orderBy, setOrderBy] = useState('date'); // Default sort by date

  const currentUser = AuthService.getCurrentUser();
  const currentUserId = currentUser?.user_id;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const timestamp = new Date().getTime();
      
      console.log(`Fetching history data at ${new Date().toISOString()}`);
      
      // Fetch data - use standard history endpoint, ignore sorting params for now
      const data = await ApiService.getSelectionHistory(
        false, 
        false, // API sorting not needed here, handled client-side
        timestamp 
      );
      
      console.log("Raw history response:", data); 
      
      if (!data) {
        console.error('Selection history data is undefined or null');
        setError('Invalid data received from server');
        setHistory([]);
        return;
      }
      
      setHistory(data); // Set the raw, unsorted data
    } catch (err) {
      console.error('Failed to load selection history:', err);
      if (err.message && !err.message.includes("Session expired")) {
          setError(`Failed to load selection history: ${err.message || 'Unknown error'}`);
      }
      setHistory([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchHistory();
  };

  const handleRatingUpdated = (selectionId) => {
    fetchHistory();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleRowClick = (itemId) => {
    setExpandedRowId(expandedRowId === itemId ? null : itemId);
  };

  const handleOpenEditDialog = (item, event) => {
    event.stopPropagation();
    setEditingSelection(item);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingSelection(null);
  };

  const handleRatingSubmit = () => {
    handleCloseEditDialog();
    fetchHistory(true);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property); 
  };

  const sortedHistory = useMemo(() => {
    if (!history || history.length === 0) return []; 
    return stableSort(history, getComparator(order, orderBy, currentUserId));
  }, [history, order, orderBy, currentUserId]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Selection History
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Refresh button */}
          <IconButton 
            color="primary" 
            onClick={handleRefresh} 
            disabled={loading}
            sx={{ mr: 2 }}
            title="Refresh history"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
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
          {sortedHistory.length > 0 ? (
            <TableContainer sx={{ p: 3 }}>
              <Table aria-label="selection history table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '5%' }} />
                    <TableCell sortDirection={orderBy === 'date' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'date'}
                        direction={orderBy === 'date' ? order : 'asc'}
                        onClick={(e) => handleRequestSort(e, 'date')}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'username' ? order : false}>
                       <TableSortLabel
                         active={orderBy === 'username'}
                         direction={orderBy === 'username' ? order : 'asc'}
                         onClick={(e) => handleRequestSort(e, 'username')}
                       >
                         User
                       </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'record' ? order : false}>
                       <TableSortLabel
                         active={orderBy === 'record'}
                         direction={orderBy === 'record' ? order : 'asc'}
                         onClick={(e) => handleRequestSort(e, 'record')}
                       >
                         Record
                       </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ minWidth: '120px' }} sortDirection={orderBy === 'my_rating' ? order : false}>
                       <TableSortLabel
                         active={orderBy === 'my_rating'}
                         direction={orderBy === 'my_rating' ? order : 'asc'}
                         onClick={(e) => handleRequestSort(e, 'my_rating')}
                       >
                          Your Rating
                       </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'average_rating' ? order : false}>
                        <TableSortLabel
                         active={orderBy === 'average_rating'}
                         direction={orderBy === 'average_rating' ? order : 'asc'}
                         onClick={(e) => handleRequestSort(e, 'average_rating')}
                       >
                         Avg Rating
                       </TableSortLabel>
                    </TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedHistory.map((item) => {
                    const isExpanded = item.id === expandedRowId;
                    const userRatingObj = item.ratings?.find(r => r.user_id === currentUserId);
                    const userRatingDisplay = userRatingObj ? userRatingObj.rating.toFixed(2) : "Not rated";
                    
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow 
                          hover
                          onClick={() => handleRowClick(item.id)}
                          sx={{ 
                            '& > td': { verticalAlign: 'top' }, 
                            cursor: 'pointer' 
                          }}
                        >
                          <TableCell padding="checkbox">
                            <IconButton aria-label="expand row" size="small" onClick={() => handleRowClick(item.id)}>
                              {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              {formatDate(item.timestamp)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="body2">
                                {item.chosen_user?.username || 'Unknown'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {item.record?.cover_url ? (
                                <Avatar 
                                  src={item.record.cover_url} 
                                  alt={`${item.record?.artist} - ${item.record?.title}`}
                                  sx={{ width: 30, height: 30, mr: 1 }}
                                />
                              ) : (
                                <MusicNoteIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                              )}
                              <Tooltip title={`Added by: ${item.record?.owner?.username || 'Unknown'}`}>
                                <Typography variant="body2">
                                  {item.record ? `${item.record.artist} - ${item.record.title}` : 'Unknown Record'}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ minWidth: '120px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" sx={{ color: userRatingObj ? 'inherit' : 'text.secondary', mr: 0.5 }}>
                                {userRatingDisplay}
                              </Typography>
                              <IconButton 
                                size="small" 
                                onClick={(e) => handleOpenEditDialog(item, e)} 
                                aria-label="edit rating"
                                title={userRatingObj ? "Edit your rating" : "Add your rating"}
                              >
                                <EditIcon fontSize="inherit" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {item.average_rating !== null ? (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">
                                  {item.average_rating.toFixed(2)}
                                </Typography>
                                {item.ratings && (
                                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                    ({item.ratings.length})
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No ratings
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {item.participants && (
                                <Chip
                                  size="small"
                                  label={`${item.participants.split(',').length} participants`}
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                              {item.weight_changes && item.chosen_user_id && (
                                <Chip
                                  size="small"
                                  label={`Weight: ${JSON.parse(item.weight_changes)[item.chosen_user_id] || 'N/A'}`}
                                  color="secondary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 1, padding: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="h6" gutterBottom component="div">
                                  Ratings for this Session
                                </Typography>
                                {item.ratings && item.ratings.length > 0 ? (
                                  <Table size="small" aria-label="participant ratings">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Participant</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rating</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {[...item.ratings]
                                        .sort((a, b) => (a.user?.username || '').localeCompare(b.user?.username || ''))
                                        .map((ratingDetail) => (
                                        <TableRow key={ratingDetail.id || ratingDetail.user_id}>
                                          <TableCell component="th" scope="row">
                                            {ratingDetail.user?.username || 'Unknown User'}
                                          </TableCell>
                                          <TableCell align="right">{ratingDetail.rating.toFixed(2)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    No ratings submitted for this session.
                                  </Typography>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No selection history available yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Start making selections to build your history
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      {editingSelection && (
        <RatingEditDialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          selection={editingSelection}
          onRatingSubmit={handleRatingSubmit}
        />
      )}
    </Box>
  );
};

export default History; 