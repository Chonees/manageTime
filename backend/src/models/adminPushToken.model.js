const mongoose = require('mongoose');

const adminPushTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pushToken: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Índice para búsquedas eficientes por userId
adminPushTokenSchema.index({ userId: 1 });

// Índice para búsquedas eficientes de tokens activos
adminPushTokenSchema.index({ isActive: 1 });

module.exports = mongoose.model('AdminPushToken', adminPushTokenSchema, 'adminpushtokens');
