# README: backend/server.js - Servidor Express Principal

## 📋 **¿Qué es este archivo?**

`backend/server.js` es el **corazón del backend** de ManageTime. Es el servidor Express.js que maneja todas las peticiones API, conecta con MongoDB, configura middlewares de seguridad, y orquesta todas las rutas del sistema. Es el punto de entrada principal del backend.

## 🎯 **Propósito**
- Inicializar el servidor Express
- Configurar conexión con MongoDB
- Establecer middlewares (CORS, JSON, Morgan)
- Definir todas las rutas API
- Manejar autenticación y seguridad
- Servir archivos estáticos
- Gestionar el puerto de escucha

## ⚡ **¿Cómo funciona?**

Este servidor actúa como el **sistema central** del backend:
1. **Carga variables de entorno** (.env)
2. **Configura Express** con middlewares necesarios
3. **Conecta con MongoDB** usando Mongoose
4. **Define rutas API** para cada módulo
5. **Escucha peticiones** en puerto configurado
6. **Maneja CORS** para acceso desde mobile/web

---

## 📖 **Explicación Línea por Línea**

### **Línea 1: Configuración de Entorno**
```javascript
require('dotenv').config();
```
- **¿Qué hace?** Carga las variables del archivo `.env`
- **Importante:** Debe ser la primera línea para que las variables estén disponibles
- **Variables cargadas:** `PORT`, `MONGODB_URI`, `JWT_SECRET`, etc.

### **Líneas 2-5: Importación de Dependencias Core**
```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
```
- **`express`**: Framework web para Node.js
- **`mongoose`**: ODM (Object Document Mapper) para MongoDB
- **`cors`**: Middleware para habilitar Cross-Origin Resource Sharing
- **`morgan`**: Logger HTTP para desarrollo

### **Líneas 8-19: Importación de Rutas**
```javascript
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
const taskTemplateRoutes = require('./src/routes/taskTemplateRoutes.js');
```
- **¿Qué hace?** Importa todos los módulos de rutas
- **Cada ruta maneja:** Un área específica de la aplicación
- **Organización:** Cada archivo contiene endpoints relacionados

---

## 🔧 **Inicialización y Configuración**

### **Líneas 22-23: Creación de App y Puerto**
```javascript
const app = express();
const PORT = process.env.PORT || 5000;
```
- **`app`**: Instancia principal de Express
- **`PORT`**: Puerto del servidor (por defecto 5000)
- **Prioridad:** Usa variable de entorno, sino puerto 5000

### **Líneas 26-34: Configuración CORS Completa**
```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
```
- **`origin: '*'`**: **CRÍTICO** - Permite acceso desde cualquier origen
- **`methods`**: Métodos HTTP permitidos
- **`allowedHeaders`**: Headers que el cliente puede enviar
- **`credentials: true`**: Permite envío de cookies/credenciales
- **`optionsSuccessStatus: 204`**: Código de respuesta para preflight

### **Líneas 35-36: Middlewares Básicos**
```javascript
app.use(express.json());
app.use(morgan('dev'));
```
- **`express.json()`**: Parsea body JSON en las peticiones
- **`morgan('dev')`**: Loguea peticiones HTTP en consola con formato desarrollo

### **Línea 39: Archivos Estáticos**
```javascript
app.use(express.static('public'));
```
- **¿Qué hace?** Sirve archivos estáticos desde carpeta `public`
- **Uso:** Imágenes, CSS, JavaScript del panel admin

---

## 🔐 **Middleware de Compatibilidad Android**

### **Líneas 42-56: Middleware Personalizado CORS**
```javascript
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
```
- **Propósito:** Asegurar compatibilidad con Android y Expo
- **Duplicación CORS:** Refuerza headers para clientes problemáticos
- **OPTIONS handling:** Responde rápidamente a preflight requests
- **Logging:** Registra todas las peticiones con timestamp

---

## 🗄️ **Conexión MongoDB**

### **Líneas 59-63: Conexión a Base de Datos**
```javascript
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manageTime', {
  family: 4 // Forzar IPv4
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));
```
- **URI por defecto:** `mongodb://127.0.0.1:27017/manageTime`
- **`family: 4`**: **IMPORTANTE** - Fuerza IPv4 para evitar problemas de conexión
- **Base de datos:** `manageTime`
- **Manejo de errores:** Loguea si falla la conexión

---

## 🛣️ **Definición de Rutas API**

### **Líneas 66-76: Montaje de Rutas**
```javascript
app.use('/api/auth', authRoutes);          // Autenticación (login, register, verify)
app.use('/api/users', userRoutes);         // Gestión de usuarios
app.use('/api/locations', locationRoutes);  // Ubicaciones GPS
app.use('/api/tasks', taskRoutes);         // Gestión de tareas
app.use('/api/stats', statsRoutes);        // Estadísticas
app.use('/api/activities', activityRoutes); // Registro de actividades
app.use('/api/reports', reportRoutes);     // Reportes
app.use('/api/task-reports', taskReportRoutes); // Reportes de tareas
app.use('/api/saved-locations', savedLocationRoutes); // Ubicaciones guardadas
app.use('/api/notifications', notificationRoutes); // Notificaciones
app.use('/api/task-templates', taskTemplateRoutes); // Plantillas de tareas
```

### **Estructura de Endpoints:**
- **Base URL:** `http://servidor:puerto/api/`
- **Ejemplo completo:** `http://localhost:5000/api/auth/login`
- **Organización:** Cada ruta maneja un dominio específico

---

## 🏥 **Health Check Endpoint**

### **Líneas 79-84: Ruta de Verificación**
```javascript
app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Servidor ManageTime funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});
```
- **Propósito:** Verificar que el servidor está activo
- **Respuesta:** JSON con mensaje y timestamp
- **Uso:** Health checks, monitoreo, debugging
- **Código HTTP:** 200 (OK)

---

## 🚀 **Inicio del Servidor**

### **Líneas 87-89: Listen en Puerto**
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
```
- **`PORT`**: Variable de entorno o 5000
- **`'0.0.0.0'`**: **CRÍTICO** - Escucha en todas las interfaces de red
- **Callback:** Confirma inicio exitoso en consola

### **¿Por qué '0.0.0.0'?**
- **localhost (127.0.0.1):** Solo accesible localmente
- **0.0.0.0:** Accesible desde cualquier interfaz de red
- **Necesario para:** Expo, dispositivos móviles, túneles

---

## 🔄 **Flujo de una Petición**

```
Cliente (Mobile/Web)
    ↓
CORS Middleware
    ↓
JSON Parser
    ↓
Morgan Logger
    ↓
Custom Headers
    ↓
Route Handler (/api/...)
    ↓
Controller Logic
    ↓
MongoDB Query
    ↓
Response to Client
```

---

## 🛡️ **Características de Seguridad**

1. **CORS Configurado:** Control de acceso cross-origin
2. **Headers Personalizados:** Compatibilidad mejorada
3. **Logging Completo:** Auditoría de todas las peticiones
4. **Manejo de OPTIONS:** Soporte preflight requests
5. **Variables de Entorno:** Credenciales seguras

---

## 📊 **Rutas API Disponibles**

| Ruta Base | Descripción | Autenticación |
|-----------|-------------|---------------|
| `/api/auth` | Login, registro, verificación | No |
| `/api/users` | CRUD usuarios | Sí (JWT) |
| `/api/tasks` | CRUD tareas | Sí (JWT) |
| `/api/locations` | Tracking GPS | Sí (JWT) |
| `/api/activities` | Log actividades | Sí (JWT) |
| `/api/stats` | Estadísticas | Sí (Admin) |
| `/api/reports` | Generación reportes | Sí (Admin) |
| `/api/notifications` | Push notifications | Sí (JWT) |
| `/api/task-templates` | Plantillas | Sí (Admin) |
| `/api/saved-locations` | Ubicaciones guardadas | Sí (JWT) |

---

## 🔧 **Variables de Entorno Requeridas**

```env
PORT=5000                    # Puerto del servidor
MONGODB_URI=mongodb://...    # URI de MongoDB
JWT_SECRET=...              # Secret para tokens JWT
JWT_EXPIRES_IN=7d           # Duración de tokens
```

---

## 🚨 **Errores Comunes y Soluciones**

### **Error: EADDRINUSE**
- **Causa:** Puerto ya en uso
- **Solución:** Cambiar puerto o matar proceso

### **Error: MongoNetworkError**
- **Causa:** MongoDB no está corriendo
- **Solución:** Iniciar MongoDB service

### **Error: CORS blocked**
- **Causa:** Headers incorrectos
- **Solución:** Verificar configuración CORS

---

## 📝 **Notas de Desarrollo**

- El servidor usa **IPv4** forzado para evitar problemas de conexión
- **CORS permisivo** (`origin: '*'`) para desarrollo
- **Morgan** en modo 'dev' para debugging detallado
- **Doble configuración CORS** para máxima compatibilidad
- Escucha en **todas las interfaces** (0.0.0.0)

Este archivo es el **núcleo del backend** y cualquier cambio aquí afecta toda la aplicación.
