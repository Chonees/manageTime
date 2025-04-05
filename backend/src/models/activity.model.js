const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para las actividades del sistema
const ActivitySchema = new Schema({
  // Usuario que realizó la actividad
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // La tarea asociada (puede ser opcional en algunos tipos de actividades)
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  
  // Tipo de actividad (location_enter, location_exit, task_complete, etc.)
  type: {
    type: String,
    required: true,
    enum: ['location_enter', 'location_exit', 'task_complete', 'task_create', 'task_update', 'task_delete']
  },
  
  // Mensaje descriptivo de la actividad
  message: {
    type: String,
    required: true
  },
  
  // Datos adicionales en formato JSON
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// Crear índice para mejorar las consultas por usuario
ActivitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
