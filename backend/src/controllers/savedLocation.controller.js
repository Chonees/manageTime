const SavedLocation = require('../models/savedLocation.model');
const mongoose = require('mongoose');

/**
 * Get all saved locations for the authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSavedLocations = async (req, res) => {
  try {
    const savedLocations = await SavedLocation.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json(savedLocations);
  } catch (error) {
    console.error('Error getting saved locations:', error);
    res.status(500).json({ message: 'Error retrieving saved locations', error: error.message });
  }
};

/**
 * Get a specific saved location by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSavedLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid location ID format' });
    }
    
    const savedLocation = await SavedLocation.findOne({ _id: id, user: req.user._id });
    
    if (!savedLocation) {
      return res.status(404).json({ message: 'Saved location not found' });
    }
    
    res.status(200).json(savedLocation);
  } catch (error) {
    console.error('Error getting saved location by ID:', error);
    res.status(500).json({ message: 'Error retrieving saved location', error: error.message });
  }
};

/**
 * Create a new saved location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createSavedLocation = async (req, res) => {
  try {
    const { name, location, radius } = req.body;
    
    // Validate required fields
    if (!name || !location || !radius) {
      return res.status(400).json({ message: 'Name, location, and radius are required' });
    }
    
    // Validate location format
    if (!location.type || location.type !== 'Point' || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'Location must be a GeoJSON Point with coordinates [longitude, latitude]' });
    }
    
    // Validate radius
    if (typeof radius !== 'number' || radius < 0.1 || radius > 50) {
      return res.status(400).json({ message: 'Radius must be a number between 0.1 and 50 kilometers' });
    }
    
    // Check if a location with the same name already exists for this user
    const existingLocation = await SavedLocation.findOne({ user: req.user._id, name });
    if (existingLocation) {
      return res.status(409).json({ message: 'A location with this name already exists' });
    }
    
    const newLocation = new SavedLocation({
      user: req.user._id,
      name,
      location: {
        type: 'Point',
        coordinates: location.coordinates
      },
      radius
    });
    const savedLocation = await newLocation.save();
    res.status(201).json(savedLocation);
  } catch (error) {
    console.error('Error creating saved location:', error);
    res.status(500).json({ message: 'Error creating saved location', error: error.message });
  }
};

/**
 * Update an existing saved location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSavedLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, radius } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid location ID format' });
    }
    
    // Find the location to update
    const existingLocation = await SavedLocation.findOne({ _id: id, user: req.user._id });
    if (!existingLocation) {
      return res.status(404).json({ message: 'Saved location not found' });
    }
    
    // Prepare update data
    const updateData = {};
    
    if (name) {
      // Check if another location with this name exists (excluding the current one)
      const nameExists = await SavedLocation.findOne({ 
        user: req.user._id, 
        name, 
        _id: { $ne: id } 
      });
      
      if (nameExists) {
        return res.status(409).json({ message: 'Another location with this name already exists' });
      }
      
      updateData.name = name;
    }
    
    if (location) {
      // Validate location format
      if (!location.type || location.type !== 'Point' || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
        return res.status(400).json({ message: 'Location must be a GeoJSON Point with coordinates [longitude, latitude]' });
      }
      
      updateData.location = {
        type: 'Point',
        coordinates: location.coordinates
      };
    }
    
    if (radius !== undefined) {
      // Validate radius
      if (typeof radius !== 'number' || radius < 0.1 || radius > 50) {
        return res.status(400).json({ message: 'Radius must be a number between 0.1 and 50 kilometers' });
      }
      
      updateData.radius = radius;
    }
    
    // Update the location
    const updatedLocation = await SavedLocation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedLocation);
  } catch (error) {
    console.error('Error updating saved location:', error);
    res.status(500).json({ message: 'Error updating saved location', error: error.message });
  }
};

/**
 * Delete a saved location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSavedLocation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid location ID format' });
    }
    
    // Find and delete the location
    const deletedLocation = await SavedLocation.findOneAndDelete({ _id: id, user: req.user._id });
    
    if (!deletedLocation) {
      return res.status(404).json({ message: 'Saved location not found' });
    }
    
    res.status(200).json({ message: 'Saved location deleted successfully', id });
  } catch (error) {
    console.error('Error deleting saved location:', error);
    res.status(500).json({ message: 'Error deleting saved location', error: error.message });
  }
};

module.exports = {
  getSavedLocations,
  getSavedLocationById,
  createSavedLocation,
  updateSavedLocation,
  deleteSavedLocation
};
