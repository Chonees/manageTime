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
    enum: ['waiting_for_acceptance', 'on_the_way', 'on_site', 'completed'],
    default: 'waiting_for_acceptance'
  },
  userIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Mantener userId para compatibilidad con código existente
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  keywords: {
    type: String,
    trim: true,
    default: '' // Palabras clave separadas por comas para la activación por voz
  },
  startedAt: {
    type: Date
  },
  timeLimit: {
    type: Number,
    min: 1,
    default: 0 // Tiempo límite en minutos
  },
  timeLimitSet: {
    type: Date,
    default: null // Fecha en que se estableció el tiempo límite
  },
  timeExpired: {
    type: Boolean,
    default: false // Indica si la tarea ha expirado por tiempo
  },
  rejected: {
    type: Boolean,
    default: false
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Asegurar que los IDs se conviertan a string para consistencia
      if (ret._id) ret._id = ret._id.toString();
      
      // Procesar userId (para compatibilidad)
      if (ret.userId && typeof ret.userId === 'object' && ret.userId._id) {
        ret.userId._id = ret.userId._id.toString();
      } else if (ret.userId && typeof ret.userId !== 'object') {
        ret.userId = ret.userId.toString();
      }
      
      // Procesar array de userIds
      if (ret.userIds && Array.isArray(ret.userIds)) {
        ret.userIds = ret.userIds.map(user => {
          if (typeof user === 'object' && user._id) {
            user._id = user._id.toString();
            return user;
          } else if (typeof user !== 'object') {
            return user.toString();
          }
          return user;
        });
      }
      
      return ret;
    }
  }
});

// Añadir índice geoespacial para permitir búsquedas por ubicación
taskSchema.index({ location: '2dsphere' });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
