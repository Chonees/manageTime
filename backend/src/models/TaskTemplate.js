const mongoose = require('mongoose');

const taskTemplateSchema = new mongoose.Schema({
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
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: function() {
        return this.location && this.location.type;
      }
    }
  },
  radius: {
    type: Number,
    default: 1.0
  },
  locationName: {
    type: String,
    trim: true
  },
  timeLimit: {
    type: Number, // Tiempo límite en minutos
    min: 0
  },
  keywords: [{
    type: String,
    trim: true
  }],
  handsFreeMode: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Crear índice geoespacial
taskTemplateSchema.index({ location: '2dsphere' });

const TaskTemplate = mongoose.model('TaskTemplate', taskTemplateSchema);

module.exports = TaskTemplate;
