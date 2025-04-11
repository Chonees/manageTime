const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
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
  completed: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'in-progress', 'completed', 'paused'],
    default: 'pending'
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
    default: 1.0, // Radio en kilómetros
    min: 0.1,
    max: 50
  },
  locationName: {
    type: String,
    trim: true,
    default: ''
  },
  handsFreeMode: {
    type: Boolean,
    default: false // Por defecto, las tareas no tienen modo manos libres
  },
  startedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Asegurar que los IDs se conviertan a string para consistencia
      if (ret._id) ret._id = ret._id.toString();
      if (ret.userId && typeof ret.userId === 'object' && ret.userId._id) {
        ret.userId._id = ret.userId._id.toString();
      } else if (ret.userId && typeof ret.userId !== 'object') {
        ret.userId = ret.userId.toString();
      }
      return ret;
    }
  }
});

// Añadir índice geoespacial para permitir búsquedas por ubicación
taskSchema.index({ location: '2dsphere' });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
