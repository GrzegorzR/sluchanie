import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Paper,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  DialogTitle,
  Dialog,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
} from '@mui/material';
import { 
  Casino as CasinoIcon, 
  MusicNote as MusicIcon, 
  Person as PersonIcon,
  Album as AlbumIcon,
  Group as GroupIcon,
  PeopleOutline as PeopleOutlineIcon,
} from '@mui/icons-material';
import ApiService from '../services/ApiService';

// Helper function for stable sorting
function descendingComparator(a, b, orderBy) {
  let bValue = b[orderBy];
  let aValue = a[orderBy];

  // Handle non-numeric sorting for username
  if (orderBy === 'username') {
    bValue = bValue?.toLowerCase() || '';
    aValue = aValue?.toLowerCase() || '';
  }
  // Ensure numeric comparison for weight and presents
  if (orderBy === 'weight' || orderBy === 'presents') {
    bValue = Number(bValue) || 0;
    aValue = Number(aValue) || 0;
  }

  if (bValue < aValue) {
    return -1;
  }
  if (bValue > aValue) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
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

// Define table headers
const headCells = [
  { id: 'present', numeric: false, disablePadding: true, label: 'Present' },
  { id: 'username', numeric: false, disablePadding: false, label: 'Username' },
  { id: 'weight', numeric: true, disablePadding: false, label: 'Weight' },
  { id: 'presents', numeric: true, disablePadding: false, label: 'Presents' },
];

const Selection = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectionResult, setSelectionResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  
  // Sorting state
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('username');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, recordsData, selectionsData] = await Promise.all([
        ApiService.getPersons(),
        ApiService.getAllRecords(),
        ApiService.getSelectionHistory(false, false)
      ]);

      // Calculate presence counts
      const presentsCount = {};
      selectionsData.forEach(selection => {
        if (selection.participants) {
          const participantIds = selection.participants.split(',').map(id => parseInt(id, 10));
          participantIds.forEach(id => {
            presentsCount[id] = (presentsCount[id] || 0) + 1;
          });
        }
      });

      // Merge presents count into users data
      const usersWithPresents = usersData.map(user => ({
        ...user,
        presents: presentsCount[user.id] || 0
      }));

      setUsers(usersWithPresents);
      setAllRecords(recordsData);
      setLoading(false);
    } catch (err) {
      console.error("Fetch Data Error:", err);
      setError('Failed to load data. Ensure backend is running and API endpoints are correct.');
      setLoading(false);
    }
  };

  const handleUserSelect = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Memoize the sorted users array
  const sortedUsers = useMemo(() => {
      return stableSort(users, getComparator(order, orderBy));
  }, [users, order, orderBy]);

  const handlePerformSelection = async () => {
    if (selectedUsers.length < 2) {
      setError('Please select at least 2 users');
      return;
    }

    if (allRecords.length === 0) {
      setError('There are no records in the collection to select from');
      return;
    }

    try {
      setSelecting(true);
      setError('');
      
      // Simulating some delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await ApiService.performSelection(selectedUsers);
      
      // Find the selected record to get cover_url
      const recordParts = result.chosen_record.split(' - ');
      const artist = recordParts[0];
      const title = recordParts.slice(1).join(' - '); // Handle titles with hyphens
      
      const selectedRecord = allRecords.find(
        record => record.artist === artist && record.title === title
      );
      
      if (selectedRecord) {
        result.cover_url = selectedRecord.cover_url;
      }
      
      setSelectionResult(result);
      setResultDialogOpen(true);
      setSuccess(true);
    } catch (err) {
      // Handle the specific error message from the backend
      const errorMsg = err.response?.data?.detail || 'Selection failed';
      
      // Make the error message more user-friendly
      if (errorMsg.includes("None of the selected users have unused records")) {
        setError('None of the selected users have unused records available. Add some records or select different users.');
      } else if (errorMsg.includes("No unused records found for user")) {
        setError('The selected user has no unused records available. This may be due to a race condition - please try again.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setSelecting(false);
    }
  };

  const handleCloseDialog = async () => {
    setResultDialogOpen(false);
    
    try {
      // Pre-fetch history data to ensure the cache is updated
      console.log("Pre-fetching history data before navigation");
      const timestamp = new Date().getTime();
      const cacheBustUrl = `/selection/history/_${timestamp}`;
      await ApiService.getSelectionHistoryNoCaching(cacheBustUrl, false, false);
      
      // Navigate to history page after closing dialog
      navigate('/history');
    } catch (error) {
      console.error("Error pre-fetching history:", error);
      // Navigate anyway
      navigate('/history');
    }
  };

  const handleAlertClose = () => {
    setSuccess(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Record Selection
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Select Users
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select the users who are present. The algorithm will choose one user (based on their weights) who has unused records, then randomly select one of their records. Users without unused records will not be eligible for selection.
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table stickyHeader aria-label="select users table" sx={{ tableLayout: 'fixed' }}>
                      <TableHead>
                        <TableRow>
                          {headCells.map((headCell, index) => (
                            <TableCell
                              key={headCell.id}
                              align={headCell.id === 'present' ? 'left' : (headCell.numeric ? 'right' : 'left')}
                              padding={headCell.disablePadding ? 'none' : 'normal'}
                              sortDirection={orderBy === headCell.id ? order : false}
                              sx={{
                                fontWeight: 'bold',
                                bgcolor: 'grey.100',
                                pl: headCell.id === 'present' ? 2 : 'inherit',
                                borderRight: index < headCells.length - 1 ? '1px solid rgba(224, 224, 224, 1)' : 'none',
                                width: headCell.id === 'present' ? '15%' : 'auto',
                              }}
                            >
                              {headCell.id === 'present' ? (
                                headCell.label
                              ) : (
                                <TableSortLabel
                                  active={orderBy === headCell.id}
                                  direction={orderBy === headCell.id ? order : 'asc'}
                                  onClick={(event) => handleRequestSort(event, headCell.id)}
                                >
                                  {headCell.label}
                                </TableSortLabel>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedUsers.map((user) => {
                          const isItemSelected = selectedUsers.includes(user.id);
                          return (
                            <TableRow 
                              key={user.id}
                              hover
                              onClick={() => handleUserSelect(user.id)}
                              role="checkbox"
                              aria-checked={isItemSelected}
                              tabIndex={-1}
                              selected={isItemSelected}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell 
                                padding="checkbox"
                                sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', width: '15%' }}
                              >
                                <Checkbox
                                  color="primary"
                                  checked={isItemSelected}
                                />
                              </TableCell>
                              <TableCell 
                                component="th" 
                                scope="row"
                                sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}
                              >
                                {user.username}
                              </TableCell>
                              <TableCell 
                                align="right"
                                sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}
                              >
                                {user.weight}
                              </TableCell>
                              <TableCell align="right">
                                {user.presents}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<CasinoIcon />}
                    onClick={handlePerformSelection}
                    disabled={selecting || selectedUsers.length < 2}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    {selecting ? 'Selecting...' : 'Perform Selection'}
                  </Button>
                </Box>
              </>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Collection Info
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <AlbumIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Records" 
                    secondary={allRecords.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <GroupIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="All Users" 
                    secondary={users.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Selected" 
                    secondary={selectedUsers.length}
                  />
                </ListItem>
              </List>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Only users with unused records can be selected. The selection algorithm will choose a user based on weights, then randomly select one of their unused records.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Result Dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div" align="center">
            Selection Result
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectionResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon color="primary" sx={{ fontSize: 30, mr: 1 }} />
                <Typography variant="h5" color="primary.main">
                  {selectionResult.chosen_username}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                {selectionResult.cover_url ? (
                  <Avatar 
                    src={selectionResult.cover_url} 
                    alt={selectionResult.chosen_record}
                    sx={{ width: 60, height: 60, mr: 2 }}
                  />
                ) : (
                  <MusicIcon color="secondary" sx={{ fontSize: 30, mr: 1 }} />
                )}
                <Typography variant="h6" color="secondary.main">
                  {selectionResult.chosen_record}
                </Typography>
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                New Weights:
              </Typography>
              
              <List dense>
                {users
                  .filter(u => selectedUsers.includes(u.id))
                  .map((user, index) => (
                    <ListItem key={user.id}>
                      <ListItemText
                        primary={user.username}
                        secondary={`New weight: ${selectionResult.new_weights[index]}`}
                      />
                    </ListItem>
                  ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleAlertClose}
        message="Selection completed successfully!"
      />
    </Box>
  );
};

export default Selection; 