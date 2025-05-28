require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

// Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const locationRoutes = require('./src/routes/location.routes');
const taskRoutes = require('./src/routes/task.routes');
const statsRoutes = require('./src/routes/stats.routes');
const activityRoutes = require('./src/routes/activity.routes');
const reportRoutes = require('./src/routes/report.routes');
const taskReportRoutes = require('./src/routes/taskReport.routes');
const savedLocationRoutes = require('./src/routes/savedLocation.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const idleTimeRoutes = require('./src/routes/idle-time.routes');
// Importar rutas de plantillas de tareas
const taskTemplateRoutes = require('./src/routes/taskTemplateRoutes.js');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(morgan('dev'));

// Middleware para mejorar compatibilidad con Android
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Manejar solicitudes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // Registrar información de la solicitud para depuración
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origen: ${req.headers.origin || 'desconocido'}`);
  
  next();
});

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manageTime', {
  family: 4 // Forzar IPv4
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/task-reports', taskReportRoutes);
app.use('/api/saved-locations', savedLocationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/task-templates', taskTemplateRoutes);
app.use('/api/idle-time', idleTimeRoutes);

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Servidor ManageTime funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
