const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Saved Location Schema
 * Stores user-saved locations with coordinates and radius
 */
const SavedLocationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 0.1,
    max: 50 // Maximum radius in kilometers
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
SavedLocationSchema.index({ location: '2dsphere' });

// Create a compound index on user and name for faster lookups
SavedLocationSchema.index({ user: 1, name: 1 });

const SavedLocation = mongoose.model('SavedLocation', SavedLocationSchema);

module.exports = SavedLocation;
