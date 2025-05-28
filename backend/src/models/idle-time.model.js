const mongoose = require('mongoose');

const idleTimeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  totalIdleTime: {
    type: Number,  // Tiempo en milisegundos
    default: 0
  },
  totalProductiveTime: {
    type: Number,  // Tiempo en milisegundos
    default: 0
  },
  sessionStart: {
    type: Date,
    default: Date.now
  },
  idleStart: {
    type: Date,
    default: Date.now
  },
  isInTaskRadius: {
    type: Boolean,
    default: false
  },
  currentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  sessionActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Índices para mejorar el rendimiento de consultas
idleTimeSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('IdleTime', idleTimeSchema);
