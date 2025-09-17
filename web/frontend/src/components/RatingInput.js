import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Tooltip, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  TextField,
  Collapse,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { Edit as EditIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';

const RatingInput = ({ selectionId, initialRating, onRatingUpdated, ratings = [] }) => {
  const [tempRating, setTempRating] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [error, setError] = useState('');
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [userRating, setUserRating] = useState(null);
  
  // Get current user
  const currentUser = AuthService.getCurrentUser();
  const currentUserId = currentUser?.user_id;
  
  // Find current user's rating on mount
  useEffect(() => {
    if (ratings && ratings.length > 0 && currentUserId) {
      const userRatingObj = ratings.find(r => r.user_id === currentUserId);
      if (userRatingObj) {
        setUserRating(userRatingObj.rating);
        setTempRating(userRatingObj.rating);
      }
    }
  }, [ratings, currentUserId]);

  const handleRatingChange = (event) => {
    setTempRating(event.target.value);
  };

  const handleSubmitRating = async () => {
    // Validate the input
    const numValue = parseFloat(tempRating);
    
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (numValue < 0 || numValue > 10) {
      setError('Rating must be between 0 and 10');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      // Submit the new rating to the API
      await ApiService.rateSelection(selectionId, numValue);
      
      // Update local state
      setUserRating(numValue);
      setShowRatingInput(false);
      
      // Notify parent component that rating was updated
      if (onRatingUpdated) {
        onRatingUpdated(numValue);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSubmitRating();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Display user rating or option to add rating - MAKE THIS CLICKABLE */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 1,
          cursor: 'pointer', // Add pointer cursor
          width: 'fit-content' // Prevent box stretching unnecessarily
        }}
        onClick={() => setShowRatings(!showRatings)} // Toggle ratings list on click
      >
        {userRating !== null ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Your rating (click to view all)">
              <Typography variant="body2" component="span">
                {userRating.toFixed(2)}
              </Typography>
            </Tooltip>
            
            <Tooltip title="Edit your rating">
              <Button
                variant="text"
                size="small"
                // Prevent click from bubbling up to the outer box toggler
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowRatingInput(!showRatingInput); 
                }}
                sx={{ minWidth: '32px', padding: '4px', ml: 0.5 }}
              >
                <EditIcon fontSize="small" />
              </Button>
            </Tooltip>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
              Not rated
            </Typography>
            
            <Tooltip title="Add your rating">
              <Button
                variant="text"
                size="small"
                // Prevent click from bubbling up to the outer box toggler
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowRatingInput(!showRatingInput); 
                }}
                sx={{ minWidth: '32px', padding: '4px', ml: 0.5 }}
              >
                <EditIcon fontSize="small" />
              </Button>
            </Tooltip>
          </Box>
        )}
      </Box>
      
      {/* Input field for rating - only shown when Edit/Add is clicked */}
      {showRatingInput && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, width: '100%' }}>
          <TextField
            label="Rating (0-10)"
            variant="outlined"
            size="small"
            value={tempRating}
            onChange={handleRatingChange}
            onKeyPress={handleKeyPress}
            disabled={isSubmitting}
            error={!!error}
            helperText={error || "Example: 7.25"}
            placeholder="0.00-10.00"
            sx={{ width: '140px' }}
            inputProps={{ 
              step: "0.01",
              min: 0,
              max: 10
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmitRating}
            disabled={isSubmitting}
            sx={{ ml: 1, height: '40px' }}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setShowRatingInput(false);
              setError('');
              setTempRating(userRating || '');
            }}
            sx={{ ml: 1, height: '40px' }}
          >
            Cancel
          </Button>
          
          {/* Loading indicator */}
          {isSubmitting && (
            <CircularProgress size={16} sx={{ ml: 1 }} />
          )}
        </Box>
      )}
      
      {/* Expandable section for all ratings */}
      <Collapse in={showRatings} timeout="auto" unmountOnExit>
        <Paper variant="outlined" sx={{ mt: 2, mb: 1, p: 1, maxHeight: '300px', overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            All Ratings ({ratings.length})
          </Typography>
          {ratings.length > 0 ? (
            <List dense disablePadding>
              {ratings.map((rating, index) => (
                <React.Fragment key={rating.id || index}>
                  <ListItem alignItems="flex-start" dense sx={{ px: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{
                            fontWeight: rating.user_id === currentUserId ? 'bold' : 'normal',
                            color: rating.user_id === currentUserId ? 'primary.main' : 'inherit'
                          }}>
                            {rating.user?.username || 'Anonymous'}
                            {rating.user_id === currentUserId && ' (You)'}
                          </Typography>
                          <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                            {rating.rating.toFixed(2)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(rating.timestamp)}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < ratings.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2">No ratings yet</Typography>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default RatingInput; 