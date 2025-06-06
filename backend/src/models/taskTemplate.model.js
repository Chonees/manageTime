const mongoose = require('mongoose');

const TaskTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  locationName: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  radius: {
    type: Number,
    default: 1.0
  },
  timeLimit: {
    type: Number,
    default: null
  },
  keywords: {
    type: [String],
    default: []
  },
  handsFreeMode: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexar ubicación para búsquedas geoespaciales
TaskTemplateSchema.index({ location: '2dsphere' });

TaskTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const TaskTemplate = mongoose.model('TaskTemplate', TaskTemplateSchema);

module.exports = TaskTemplate;
