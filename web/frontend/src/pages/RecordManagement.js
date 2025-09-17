import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Add as AddIcon,
  MusicNote as MusicNoteIcon,
  BarChart as BarChartIcon,
  CloudUpload as CloudUploadIcon,
  Album as AlbumIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import ApiService from '../services/ApiService';

const RecordManagement = () => {
  const [users, setUsers] = useState([]);
  const [myRecords, setMyRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [usedRecords, setUsedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [mySelectedRecords, setMySelectedRecords] = useState([]);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // New record form state
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecordTitle, setNewRecordTitle] = useState('');
  const [newRecordArtist, setNewRecordArtist] = useState('');
  const [newRecordCoverUrl, setNewRecordCoverUrl] = useState('');
  const [newRecordRymUrl, setNewRecordRymUrl] = useState('');
  
  // RYM URL import state
  const [rymUrl, setRymUrl] = useState('');
  const [isImportingFromRym, setIsImportingFromRym] = useState(false);
  const [addMethod, setAddMethod] = useState('manual'); // 'manual' or 'rym'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Split API calls to handle errors separately
      try {
        const [usersData, myRecordsData, allRecordsData, usedRecordsData] = await Promise.all([
          ApiService.getPersons(),
          ApiService.getMyRecords(),
          ApiService.getAllRecords(),
          ApiService.getRecordHistory(),
        ]);
        
        setUsers(usersData);
        
        // Filter my records to only include those that have not been used (nominated)
        const nominatedRecords = myRecordsData.filter(record => !record.used);
        // My records that have been selected/used
        const myUsedRecords = myRecordsData.filter(record => record.used);
        
        setMyRecords(nominatedRecords);
        setAllRecords(allRecordsData);
        setUsedRecords(usedRecordsData);
        
        // Set my selected records directly from my used records
        setMySelectedRecords(myUsedRecords);
      } catch (err) {
        console.error("Error fetching main data:", err);
        setError('Failed to load records data');
      }
    } catch (err) {
      console.error("Global error in fetchData:", err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    
    if (!newRecordTitle.trim() || !newRecordArtist.trim()) {
      setError('Title and Artist are required');
      return;
    }
    
    try {
      setIsAddingRecord(true);
      await ApiService.createRecord(
        newRecordTitle.trim(),
        newRecordArtist.trim(),
        newRecordCoverUrl.trim(),
        newRecordRymUrl.trim()
      );
      setNewRecordTitle('');
      setNewRecordArtist('');
      setNewRecordCoverUrl('');
      setNewRecordRymUrl('');
      setSuccess('Record added successfully');
      setTimeout(() => setSuccess(''), 3000);
      // Refresh the list
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add record');
    } finally {
      setIsAddingRecord(false);
    }
  };
  
  const handleAddRecordFromRym = async (e) => {
    e.preventDefault();
    
    if (!rymUrl.trim()) {
      setError('RYM URL is required');
      return;
    }
    
    try {
      setIsImportingFromRym(true);
      await ApiService.createRecordFromRymUrl(rymUrl.trim());
      setRymUrl('');
      setSuccess('Record imported successfully from RYM');
      setTimeout(() => setSuccess(''), 3000);
      // Refresh the list
      await fetchData();
    } catch (err) {
      console.error("RYM import error:", err);
      // Show error message
      setError(err.response?.data?.detail || 'Failed to import record from RYM');
      
      // Extract artist and title from URL for manual entry
      try {
        const url = new URL(rymUrl);
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);
        
        if (pathParts.length >= 4 && pathParts[0] === 'release' && pathParts[1] === 'album') {
          const artistSlug = pathParts[2];
          const titleSlug = pathParts[3];
          
          // Convert slug to readable text
          const artistGuess = artistSlug.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          const titleGuess = titleSlug.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          // Switch to manual entry with prefilled values
          setNewRecordArtist(artistGuess);
          setNewRecordTitle(titleGuess);
          setNewRecordRymUrl(rymUrl);
          setAddMethod('manual');
          
          // Update error message
          setError('Automatic import failed. Please check and edit the pre-filled details.');
        }
      } catch (parseErr) {
        // If URL parsing fails, just switch to manual entry with the URL
        setNewRecordRymUrl(rymUrl);
        setAddMethod('manual');
        setError('Automatic import failed. Please enter the details manually.');
      }
    } finally {
      setIsImportingFromRym(false);
    }
  };

  // Delete record handlers
  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setRecordToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    
    try {
      setIsDeleting(true);
      await ApiService.deleteRecord(recordToDelete.id);
      setSuccess('Record deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Close dialog
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error deleting record:', err);
      setError(err.response?.data?.detail || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleAddMethodChange = (event, newMethod) => {
    setAddMethod(newMethod);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Record Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Add Record */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Add New Record
            </Typography>
            
            <Tabs 
              value={addMethod} 
              onChange={handleAddMethodChange} 
              sx={{ mb: 2 }}
              variant="fullWidth"
            >
              <Tab 
                label="Manual Entry" 
                value="manual" 
                icon={<AddIcon />} 
                iconPosition="start" 
              />
              <Tab 
                label="RYM URL" 
                value="rym" 
                icon={<LinkIcon />} 
                iconPosition="start" 
              />
            </Tabs>
            
            {addMethod === 'manual' && (
              <Box component="form" onSubmit={handleAddRecord}>
                <TextField
                  label="Artist"
                  variant="outlined"
                  fullWidth
                  value={newRecordArtist}
                  onChange={(e) => setNewRecordArtist(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Title"
                  variant="outlined"
                  fullWidth
                  value={newRecordTitle}
                  onChange={(e) => setNewRecordTitle(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Cover URL"
                  variant="outlined"
                  fullWidth
                  value={newRecordCoverUrl}
                  onChange={(e) => setNewRecordCoverUrl(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="https://example.com/album-cover.jpg"
                  helperText="Optional: URL to album cover image"
                />
                <TextField
                  label="Rate Your Music URL"
                  variant="outlined"
                  fullWidth
                  value={newRecordRymUrl}
                  onChange={(e) => setNewRecordRymUrl(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="https://rateyourmusic.com/release/album/..."
                  helperText="Optional: Link to Rate Your Music page"
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  disabled={isAddingRecord}
                  startIcon={<CloudUploadIcon />}
                >
                  {isAddingRecord ? 'Adding...' : 'Add to Collection'}
                </Button>
              </Box>
            )}
            
            {addMethod === 'rym' && (
              <Box component="form" onSubmit={handleAddRecordFromRym}>
                <TextField
                  label="Rate Your Music URL"
                  variant="outlined"
                  fullWidth
                  value={rymUrl}
                  onChange={(e) => setRymUrl(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="https://rateyourmusic.com/release/album/..."
                  helperText="Paste a RYM album URL to automatically import details"
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  disabled={isImportingFromRym}
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                >
                  {isImportingFromRym ? 'Importing...' : 'Import from RYM'}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  This will automatically extract the album title, artist name and cover image from the RYM page.
                </Typography>
              </Box>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Your record will be added to the shared collection.
            </Typography>
          </Paper>
        </Grid>

        {/* Right Column: Records Accordions */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* My Nominated Records Accordion */}
                <Accordion defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <MusicNoteIcon sx={{ mr: 2, color: 'secondary.main' }} />
                      <Typography variant="subtitle1">My Nominated Records ({myRecords.length})</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {myRecords.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        You haven't added any records yet or all your records have been selected.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Cover</TableCell>
                              <TableCell>Artist</TableCell>
                              <TableCell>Title</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {myRecords.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  {record.cover_url ? (
                                    <Avatar 
                                      src={record.cover_url} 
                                      alt={`${record.artist} - ${record.title}`}
                                      sx={{ width: 40, height: 40 }}
                                    />
                                  ) : (
                                    <AlbumIcon color="disabled" sx={{ width: 40, height: 40 }} />
                                  )}
                                </TableCell>
                                <TableCell>{record.artist}</TableCell>
                                <TableCell>
                                  {record.title}
                                  {record.rym_url && (
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      href={record.rym_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ ml: 1 }}
                                    >
                                      <LinkIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <IconButton 
                                    color="error" 
                                    size="small"
                                    onClick={() => handleDeleteClick(record)}
                                    title="Delete record"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* My Selected Records Accordion */}
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <CheckCircleIcon sx={{ mr: 2, color: 'success.main' }} />
                      <Typography variant="subtitle1">My Selected Records ({mySelectedRecords.length})</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {mySelectedRecords.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        None of your records have been selected yet.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Cover</TableCell>
                              <TableCell>Artist</TableCell>
                              <TableCell>Title</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {mySelectedRecords.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  {record.cover_url ? (
                                    <Avatar 
                                      src={record.cover_url} 
                                      alt={`${record.artist} - ${record.title}`}
                                      sx={{ width: 40, height: 40 }}
                                    />
                                  ) : (
                                    <AlbumIcon color="disabled" sx={{ width: 40, height: 40 }} />
                                  )}
                                </TableCell>
                                <TableCell>{record.artist}</TableCell>
                                <TableCell>
                                  {record.title}
                                  {record.rym_url && (
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      href={record.rym_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ ml: 1 }}
                                    >
                                      <LinkIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* All Users & Records Accordion */}
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <PersonIcon sx={{ mr: 2, color: 'info.main' }} />
                      <Typography variant="subtitle1">All Users & Nominated Records</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {users.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No users found in the system.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell colSpan={4}>
                                <Typography variant="subtitle2">Users and Their Nominated Records</Typography>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {users.map((user) => {
                              // Get records for this user
                              const userRecords = allRecords.filter(record => 
                                record.owner_name === user.username && !record.used
                              );
                              
                              return (
                                <React.Fragment key={user.id}>
                                  {/* User row */}
                                  <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                                    <TableCell colSpan={2}>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                        <Typography variant="body1" fontWeight="bold">
                                          {user.username}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell>Weight: {user.weight}</TableCell>
                                    <TableCell>Records: {userRecords.length}</TableCell>
                                  </TableRow>
                                  
                                  {/* Records rows */}
                                  {userRecords.length > 0 ? (
                                    userRecords.map((record) => (
                                      <TableRow key={record.id} sx={{ '& td': { pl: 4 } }}>
                                        <TableCell>
                                          {record.cover_url ? (
                                            <Avatar 
                                              src={record.cover_url} 
                                              alt={`${record.artist} - ${record.title}`}
                                              sx={{ width: 30, height: 30 }}
                                            />
                                          ) : (
                                            <AlbumIcon color="disabled" sx={{ width: 30, height: 30 }} />
                                          )}
                                        </TableCell>
                                        <TableCell>{record.artist}</TableCell>
                                        <TableCell colSpan={2}>
                                          {record.title}
                                          {record.rym_url && (
                                            <IconButton 
                                              size="small" 
                                              color="primary"
                                              href={record.rym_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              sx={{ ml: 1 }}
                                            >
                                              <LinkIcon fontSize="small" />
                                            </IconButton>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={4} sx={{ pl: 4, textAlign: 'center', fontStyle: 'italic' }}>
                                        No nominated records
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Record
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{recordToDelete?.artist} - {recordToDelete?.title}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecordManagement; 