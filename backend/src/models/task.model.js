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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
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

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
