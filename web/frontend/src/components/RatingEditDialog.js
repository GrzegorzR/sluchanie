import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';

const RatingEditDialog = ({ open, onClose, selection, onRatingSubmit }) => {
    const [tempRating, setTempRating] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const currentUser = AuthService.getCurrentUser();
    const currentUserId = currentUser?.user_id;

    // Initialize tempRating when dialog opens or selection changes
    useEffect(() => {
        if (open && selection && currentUserId) {
            const userRatingObj = selection.ratings?.find(r => r.user_id === currentUserId);
            setTempRating(userRatingObj ? userRatingObj.rating.toString() : '');
            setError(''); // Clear previous errors
        } else {
             // Reset when closed
            setTempRating('');
            setError('');
        }
    }, [open, selection, currentUserId]);

    const handleRatingChange = (event) => {
        setTempRating(event.target.value);
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
          handleSubmitRating();
        }
    };

    const handleSubmitRating = async () => {
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
            await ApiService.rateSelection(selection.id, numValue);
            onRatingSubmit(); // Notify parent (will close dialog and refresh)
        } catch (error) {
            console.error('Error submitting rating:', error);
            setError('Failed to submit rating. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setError('');
        onClose(); // Close dialog using the prop
    };

    if (!selection) return null; // Don't render if no selection is provided

    const recordDisplay = selection.record ? `${selection.record.artist} - ${selection.record.title}` : 'Unknown Record';

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
            <DialogTitle>Rate "{recordDisplay}"</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}
                <TextField
                    autoFocus
                    margin="dense"
                    id="rating"
                    label="Your Rating (0-10)"
                    type="number" // Use number type for better input control
                    fullWidth
                    variant="outlined"
                    value={tempRating}
                    onChange={handleRatingChange}
                    onKeyPress={handleKeyPress}
                    disabled={isSubmitting}
                    error={!!error} // Show error state on text field
                    helperText="Example: 7.5" 
                    inputProps={{ 
                        step: "0.01",
                        min: 0,
                        max: 10
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleSubmitRating} disabled={isSubmitting} variant="contained">
                    {isSubmitting ? <CircularProgress size={24} /> : 'Save Rating'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RatingEditDialog; 