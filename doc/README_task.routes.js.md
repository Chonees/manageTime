# README: backend/src/routes/task.routes.js - Rutas de API para Tareas

## 📋 **¿Qué es este archivo?**

`task.routes.js` es el **enrutador de endpoints para tareas** en el backend de ManageTime. Define todas las rutas API relacionadas con la gestión de tareas, aplicando middlewares de autenticación y autorización, diferenciando entre rutas públicas para usuarios y administrativas. Base path: `/api/tasks`.

## 🎯 **Propósito**
- Definir todos los endpoints de tareas
- Aplicar middleware de autenticación JWT
- Separar rutas de usuario vs admin
- Manejar notas de voz y ubicación
- Gestionar permisos por rol
- Mapear rutas a controladores

## ⚡ **¿Cómo funciona?**

El router **organiza los endpoints** de tareas:
1. **Aplica verifyToken** a todas las rutas
2. **Rutas de usuario** para gestión propia
3. **Rutas admin** con middleware isAdmin
4. **Mapea a controladores** específicos
5. **Maneja parámetros** de ruta

---

## 📖 **Estructura de Rutas**

### **Líneas 1-7: Setup Inicial**
```javascript
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Middleware global para todas las rutas
router.use(verifyToken);
```
- **Router Express**: Para definir rutas modulares
- **Controller import**: Lógica de negocio
- **Middlewares**: Autenticación y autorización
- **verifyToken global**: TODAS las rutas requieren auth

---

## 🔐 **Rutas de Usuario Autenticado**

### **GET /api/tasks/my-tasks**
```javascript
router.get('/my-tasks', (req, res) => taskController.getMyTasks(req, res));
```
- **Descripción**: Obtiene tareas del usuario actual
- **Auth**: Sí (JWT requerido)
- **Admin**: No requerido
- **Response**: Array de tareas propias
- **Filtros**: Solo tareas asignadas al usuario

### **GET /api/tasks/nearby**
```javascript
router.get('/nearby', (req, res) => taskController.getNearbyTasks(req, res));
```
- **Descripción**: Tareas cercanas por GPS
- **Query params**: `?lat=XX&lng=YY&radius=Z`
- **Auth**: Sí
- **Response**: Tareas dentro del radio
- **Uso**: Para mostrar tareas por ubicación

### **GET /api/tasks/active**
```javascript
router.get('/active', (req, res) => taskController.getActiveTask(req, res));
```
- **Descripción**: Obtiene tarea activa actual
- **Auth**: Sí
- **Response**: Tarea en progreso o null
- **Uso**: Modo manos libres, tracking actual

### **POST /api/tasks/note**
```javascript
router.post('/note', (req, res) => taskController.addTaskNote(req, res));
```
- **Descripción**: Añade nota general (no específica)
- **Body**: `{ text, type, timestamp }`
- **Auth**: Sí
- **Response**: Nota creada
- **Uso**: Notas rápidas sin tarea específica

---

## 📝 **Rutas con Parámetro :id**

### **GET /api/tasks/:id**
```javascript
router.get('/:id', (req, res) => taskController.getTaskById(req, res));
```
- **Descripción**: Obtiene tarea específica por ID
- **Params**: `:id` - MongoDB ObjectId
- **Auth**: Sí
- **Validación**: Usuario debe tener acceso a la tarea
- **Response**: Objeto tarea completo

### **PUT /api/tasks/:id**
```javascript
router.put('/:id', (req, res) => taskController.updateTask(req, res));
```
- **Descripción**: Actualiza tarea existente
- **Params**: `:id` - ID de la tarea
- **Body**: Campos a actualizar
- **Auth**: Sí
- **Validación**: Solo propietario o admin
- **Response**: Tarea actualizada

### **DELETE /api/tasks/:id**
```javascript
router.delete('/:id', (req, res) => taskController.deleteTask(req, res));
```
- **Descripción**: Elimina tarea
- **Params**: `:id` - ID de la tarea
- **Auth**: Sí
- **Validación**: Solo propietario o admin
- **Response**: Confirmación de eliminación

---

## 🎤 **Ruta de Notas de Voz**

### **POST /api/tasks/:taskId/note**
```javascript
router.post('/:taskId/note', (req, res) => taskController.addSimpleVoiceNote(req, res));
```
- **Descripción**: Añade nota de voz a tarea específica
- **Params**: `:taskId` - ID de la tarea
- **Body**: 
  ```json
  {
    "text": "Transcripción de la nota",
    "type": "voice_note",
    "timestamp": "2025-01-15T10:30:00Z"
  }
  ```
- **Auth**: Sí
- **Validación**: Usuario debe tener acceso a la tarea
- **Response**: Nota añadida a la tarea
- **Uso**: Asistente de voz, notas rápidas

---

## 👑 **Rutas Administrativas**

### **GET /api/tasks/**
```javascript
router.get('/', (req, res) => taskController.getAllTasks(req, res));
```
- **Descripción**: Obtiene todas las tareas (con filtros)
- **Query params**: 
  - `?status=pending`
  - `?userId=XXX`
  - `?page=1&limit=20`
- **Auth**: Sí
- **Permisos**: 
  - **Usuario normal**: Solo sus tareas
  - **Admin**: Tareas de sus empleados
  - **SuperAdmin**: Todas las tareas
- **Response**: Array paginado de tareas

### **POST /api/tasks/**
```javascript
router.post('/', (req, res) => taskController.createTask(req, res));
```
- **Descripción**: Crea nueva tarea
- **Body**:
  ```json
  {
    "fileNumber": "EXP-2025-001",
    "title": "Inspección de equipo",
    "description": "Descripción detallada",
    "location": {
      "type": "Point",
      "coordinates": [-58.3816, -34.6037]
    },
    "radius": 2.5,
    "locationName": "Planta Norte",
    "timeLimit": 120,
    "handsFreeMode": true,
    "keywords": "iniciar, comenzar"
  }
  ```
- **Auth**: Sí
- **Permisos**:
  - **Usuario**: Crea para sí mismo
  - **Admin**: Puede asignar a otros
- **Validación**: fileNumber requerido
- **Response**: Tarea creada

### **POST /api/tasks/assign**
```javascript
router.post('/assign', isAdmin, (req, res) => taskController.createAssignedTask(req, res));
```
- **Descripción**: Crea y asigna tareas a múltiples usuarios
- **Middleware**: `isAdmin` - Solo administradores
- **Body**:
  ```json
  {
    "fileNumber": "EXP-2025-001",
    "title": "Tarea grupal",
    "userIds": ["userId1", "userId2", "userId3"],
    "userId": "userId1",  // Compatibilidad legacy
    "...": "otros campos de tarea"
  }
  ```
- **Auth**: Sí + Admin
- **Validación**:
  - Admin normal: Solo a sus empleados asignados
  - SuperAdmin: A cualquier usuario
- **Response**: Array de tareas creadas

---

## 🔄 **Flujo de Autenticación**

```
Request → verifyToken Middleware
             ↓
         Token válido?
         No ↓     ↓ Sí
        401 Error  Continuar
                    ↓
               isAdmin? (si aplica)
               No ↓     ↓ Sí
           403 Forbidden  Controller
```

---

## 📊 **Tabla de Endpoints Completa**

| Método | Ruta | Descripción | Auth | Admin |
|--------|------|-------------|------|-------|
| GET | `/my-tasks` | Mis tareas | ✅ | ❌ |
| GET | `/nearby` | Tareas cercanas | ✅ | ❌ |
| GET | `/active` | Tarea activa | ✅ | ❌ |
| POST | `/note` | Nota general | ✅ | ❌ |
| GET | `/:id` | Tarea por ID | ✅ | ❌ |
| PUT | `/:id` | Actualizar tarea | ✅ | ❌* |
| DELETE | `/:id` | Eliminar tarea | ✅ | ❌* |
| POST | `/:taskId/note` | Nota de voz | ✅ | ❌ |
| GET | `/` | Todas las tareas | ✅ | 📊** |
| POST | `/` | Crear tarea | ✅ | 📊** |
| POST | `/assign` | Asignar tareas | ✅ | ✅ |

*Solo propietario o admin
**Respuesta filtrada según rol

---

## 🛡️ **Middlewares Aplicados**

### **1. verifyToken (Global)**
```javascript
router.use(verifyToken);
```
- **Aplicado a**: TODAS las rutas
- **Función**: Valida JWT y adjunta user a req
- **Error**: 401 si token inválido/expirado

### **2. isAdmin (Específico)**
```javascript
router.post('/assign', isAdmin, ...)
```
- **Aplicado a**: Rutas administrativas
- **Función**: Verifica req.user.isAdmin
- **Error**: 403 si no es admin

---

## 🔐 **Validaciones por Ruta**

### **Propiedad de Tarea:**
- **PUT /tasks/:id**: Solo propietario o admin
- **DELETE /tasks/:id**: Solo propietario o admin
- **POST /tasks/:taskId/note**: Usuario con acceso

### **Jerarquía Administrativa:**
- **POST /tasks/assign**: 
  - Admin → Sus empleados
  - SuperAdmin → Cualquiera

### **Filtrado Automático:**
- **GET /tasks/**: 
  - Usuario → Sus tareas
  - Admin → Tareas de empleados
  - SuperAdmin → Todas

---

## 🚨 **Códigos de Error**

| Código | Significado | Causa |
|--------|------------|-------|
| 400 | Bad Request | Datos inválidos |
| 401 | Unauthorized | Sin token o expirado |
| 403 | Forbidden | Sin permisos |
| 404 | Not Found | Tarea no existe |
| 500 | Server Error | Error interno |

---

## 💡 **Ejemplos de Uso**

### **Crear Tarea Simple:**
```bash
POST /api/tasks
Authorization: Bearer <token>
{
  "fileNumber": "001",
  "title": "Mi tarea",
  "description": "Descripción"
}
```

### **Obtener Tareas Cercanas:**
```bash
GET /api/tasks/nearby?lat=-34.6037&lng=-58.3816&radius=5
Authorization: Bearer <token>
```

### **Añadir Nota de Voz:**
```bash
POST /api/tasks/507f1f77bcf86cd799439011/note
Authorization: Bearer <token>
{
  "text": "Tarea completada sin novedades",
  "type": "voice_note",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## 📝 **Notas Importantes**

- **verifyToken global**: Todas las rutas protegidas
- **Orden de rutas**: Específicas antes que paramétricas
- **/my-tasks vs /**: Diferente alcance según endpoint
- **isAdmin selectivo**: Solo donde realmente necesario
- **Validación en controller**: Lógica adicional de permisos

Este archivo es el **punto de entrada para todas las operaciones de tareas** y define la estructura de la API REST.
