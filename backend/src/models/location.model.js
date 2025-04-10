const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['start', 'end', 'tracking'],
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for faster location queries
locationSchema.index({ userId: 1, timestamp: -1 });
// Add geospatial index
locationSchema.index({ longitude: 1, latitude: 1 }, { type: '2d' });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
