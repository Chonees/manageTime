# README: backend/src/controllers/task.controller.js - Controlador de Tareas

## 📋 **¿Qué es este archivo?**

`task.controller.js` es el **controlador más complejo del backend** de ManageTime. Gestiona todo el ciclo de vida de las tareas: creación, asignación, aceptación/rechazo, actualización de estado, completado y eliminación. Incluye registro de actividades, geolocalización, límites de tiempo, asignación múltiple y jerarquía de administradores.

## 🎯 **Propósito**
- Crear tareas con geolocalización y límites de tiempo
- Asignar tareas a usuarios únicos o múltiples
- Gestionar flujo de estados (espera → camino → sitio → completado)
- Registrar todas las actividades relacionadas
- Manejar jerarquía admin-empleado
- Controlar aceptación/rechazo de tareas
- Implementar modo manos libres con keywords
- Verificar ubicación para completar tareas

## ⚡ **¿Cómo funciona?**

El controlador maneja el **flujo completo de tareas**:
1. **Creación** con validación de fileNumber obligatorio
2. **Asignación** verificando jerarquía admin-empleado
3. **Notificación** a usuarios asignados
4. **Tracking** de estados y actividades
5. **Validación GPS** para completar en ubicación
6. **Registro de actividades** para auditoría

---

## 📖 **Funciones Principales**

### **Líneas 12-86: registerTaskActivity - Registro de Actividades**
```javascript
const registerTaskActivity = async (userId, taskId, type, taskData) => {
  try {
    let message = '';
    let metadata = {};
    
    // Construir mensaje según tipo
    switch (type) {
      case 'task_create':
        message = `Tarea "${taskData.title}" creada`;
        metadata = { 
          title: taskData.title,
          description: taskData.description || '',
          location: taskData.location || null
        };
        break;
      case 'task_complete':
        message = `Tarea "${taskData.title}" completada`;
        metadata = { 
          title: taskData.title,
          completedAt: new Date().toISOString()
        };
        break;
      // ... más casos
    }
    
    const activity = new Activity({
      userId,
      taskId,
      type,
      message,
      metadata
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error al registrar actividad:', error);
    return null; // No afecta operación principal
  }
};
```
- **Función auxiliar**: Registra todas las acciones sobre tareas
- **6 tipos de actividad**: create, complete, delete, accept, reject, on_site
- **Metadata rica**: Guarda contexto completo de cada acción
- **No blocking**: Errores no afectan operación principal

### **Tipos de Actividad Soportados:**
| Tipo | Descripción | Metadata |
|------|-------------|----------|
| `task_create` | Tarea creada | title, description, location |
| `task_complete` | Tarea completada | title, completedAt |
| `task_delete` | Tarea eliminada | title, deletedAt |
| `task_accept` | Tarea aceptada | title, acceptedAt |
| `task_reject` | Tarea rechazada | title, rejectedAt |
| `task_on_site` | Llegada al sitio | title, arrivedAt, status |

---

## 📝 **Función CREATE TASK (Líneas 171-279)**

### **Validaciones Iniciales:**
```javascript
if (!fileNumber) {
  return res.status(400).json({ message: 'El número de archivo es requerido' });
}

if (!title) {
  return res.status(400).json({ message: 'El título de la tarea es requerido' });
}
```
- **fileNumber**: **OBLIGATORIO** para tracking administrativo
- **title**: Requerido para identificación

### **Asignación de Usuario:**
```javascript
let assignedUserId = req.user._id;

// Si es admin y proporciona userId, asignar a ese usuario
if (req.user.isAdmin && userId) {
  console.log(`Admin ${req.user.username} asignando tarea a usuario: ${userId}`);
  assignedUserId = userId;
}
```
- **Auto-asignación**: Usuarios normales crean para sí mismos
- **Asignación admin**: Admins pueden asignar a otros

### **Configuración de Tiempo Límite:**
```javascript
if (timeLimit && !isNaN(Number(timeLimit)) && Number(timeLimit) > 0) {
  console.log(`Configurando tiempo límite: ${timeLimit} minutos`);
  taskData.timeLimit = Number(timeLimit);
  // NO configurar timeLimitSet al crear - se configura al aceptar
}
```
- **timeLimit**: En minutos
- **timeLimitSet**: NO se establece al crear
- **Se activa**: Cuando usuario acepta la tarea

### **Manejo de Geolocalización - 3 Formatos:**
```javascript
// Formato 1: location con coordinates como array
if (location.coordinates && Array.isArray(location.coordinates)) {
  locationObject.coordinates = location.coordinates;
}
// Formato 2: location con latitude y longitude
else if (location.latitude !== undefined && location.longitude !== undefined) {
  locationObject.coordinates = [location.longitude, location.latitude];
}
// Formato 3: location como array [lng, lat]
else if (Array.isArray(location) && location.length === 2) {
  locationObject.coordinates = location;
}

taskData.location = {
  type: 'Point',
  coordinates: locationObject.coordinates  // [longitude, latitude]
};
taskData.radius = Number(radius);          // En kilómetros
taskData.locationName = locationName;      // Nombre descriptivo
```
- **3 formatos soportados**: Para flexibilidad del frontend
- **GeoJSON Point**: Formato MongoDB estándar
- **IMPORTANTE**: Orden es [longitud, latitud]

---

## 👥 **Función CREATE ASSIGNED TASK (Líneas 282-450)**

### **Verificación de Permisos Admin:**
```javascript
if (!req.user.isAdmin) {
  return res.status(403).json({ 
    message: "No tienes permiso para crear tareas asignadas" 
  });
}
```

### **Asignación Múltiple de Usuarios:**
```javascript
let allUserIds = [];
if (userIds && Array.isArray(userIds) && userIds.length > 0) {
  allUserIds = [...userIds];  // Array de múltiples usuarios
} else if (userId) {
  allUserIds = [userId];       // Usuario único
}
```
- **Soporte dual**: Un usuario o múltiples
- **Backwards compatible**: Con código legacy

### **Verificación de Jerarquía Admin-Empleado:**
```javascript
if (!req.user.isSuperAdmin) {
  for (const id of allUserIds) {
    const targetUser = await User.findById(id);
    
    // Verificar que usuario está asignado a este admin
    if (!targetUser.assignedAdmin || 
        targetUser.assignedAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: `No puedes asignar tareas al usuario ${targetUser.username} 
                 porque no está asignado a tu gestión` 
      });
    }
  }
}
```
- **SuperAdmin**: Puede asignar a cualquiera
- **Admin normal**: Solo a sus empleados asignados
- **Verificación estricta**: Por cada usuario

### **Creación de Múltiples Tareas:**
```javascript
const createdTasks = [];

for (const assignedUserId of allUserIds) {
  const taskData = {
    fileNumber,
    title,
    description,
    userId: assignedUserId,
    userIds: allUserIds,  // Guarda todos los usuarios asignados
    completed: false,
    status: 'waiting_for_acceptance',
    // ... más campos
  };
  
  const task = new Task(taskData);
  await task.save();
  createdTasks.push(task);
  
  // Registrar actividad para cada tarea
  await registerTaskActivity(req.user._id, task._id, 'task_create', task);
}
```
- **Una tarea por usuario**: Para tracking individual
- **userIds array**: Referencia a todos los asignados
- **Actividad individual**: Por cada tarea creada

---

## ✅ **Función ACCEPT TASK (Líneas 500-600)**

```javascript
exports.acceptTask = async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.findById(taskId);
  
  // Verificar que la tarea pertenece al usuario
  if (task.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: "No puedes aceptar una tarea que no te pertenece" 
    });
  }
  
  // Activar temporizador si hay límite de tiempo
  if (task.timeLimit > 0) {
    task.timeLimitSet = new Date();
    console.log(`Timer activado: ${task.timeLimit} minutos desde ahora`);
  }
  
  task.status = 'on_the_way';
  task.acceptedAt = new Date();
  task.rejected = false;
  
  await task.save();
  
  // Registrar actividad
  await registerTaskActivity(req.user._id, taskId, 'task_accept', task);
  
  return res.json({ success: true, task });
};
```
- **Verificación de propiedad**: Solo el asignado puede aceptar
- **Activación de timer**: Al aceptar, no al crear
- **Cambio de estado**: → 'on_the_way'

---

## 🚫 **Función REJECT TASK (Líneas 601-650)**

```javascript
exports.rejectTask = async (req, res) => {
  const task = await Task.findById(taskId);
  
  task.rejected = true;
  task.rejectedAt = new Date();
  task.status = 'rejected';
  
  await task.save();
  
  // Notificar al admin
  await notificationUtil.notifyAdminActivity(
    task.userId,
    `Tarea "${task.title}" rechazada`,
    { taskId, type: 'task_rejected' }
  );
  
  await registerTaskActivity(req.user._id, taskId, 'task_reject', task);
};
```
- **Marca permanente**: rejected = true
- **Notificación admin**: Alerta inmediata
- **No se puede revertir**: Una vez rechazada

---

## 📍 **Función UPDATE STATUS (Líneas 700-800)**

```javascript
exports.updateTaskStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['waiting_for_acceptance', 'on_the_way', 'on_site', 'completed'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: 'Estado inválido' 
    });
  }
  
  const task = await Task.findById(taskId);
  
  // Si llega al sitio, registrar actividad especial
  if (status === 'on_site' && task.status !== 'on_site') {
    await registerTaskActivity(req.user._id, taskId, 'task_on_site', task);
  }
  
  task.status = status;
  await task.save();
};
```

### **Flujo de Estados:**
```
waiting_for_acceptance → on_the_way → on_site → completed
         ↓
      rejected
```

---

## ✔️ **Función COMPLETE TASK (Líneas 850-950)**

```javascript
exports.completeTask = async (req, res) => {
  const { currentLocation } = req.body;
  const task = await Task.findById(taskId);
  
  // Verificar ubicación si la tarea tiene localización
  if (task.location && task.location.coordinates) {
    const distance = calculateDistance(
      currentLocation,
      task.location.coordinates
    );
    
    if (distance > task.radius) {
      return res.status(400).json({ 
        message: `Debes estar dentro de ${task.radius}km del sitio para completar` 
      });
    }
  }
  
  // Verificar tiempo límite
  if (task.timeLimit && task.timeLimitSet) {
    const elapsed = Date.now() - new Date(task.timeLimitSet).getTime();
    const limitMs = task.timeLimit * 60 * 1000;
    
    if (elapsed > limitMs) {
      task.timeExpired = true;
    }
  }
  
  task.completed = true;
  task.status = 'completed';
  task.completedAt = new Date();
  
  await task.save();
  await registerTaskActivity(req.user._id, taskId, 'task_complete', task);
};
```
- **Validación GPS**: Debe estar dentro del radio
- **Check tiempo**: Marca si expiró
- **Estado final**: completed = true

---

## 🔄 **Flujo Completo de una Tarea**

```
1. ADMIN CREA TAREA
   ↓
2. ASIGNACIÓN (userId/userIds)
   ↓
3. NOTIFICACIÓN PUSH
   ↓
4. USUARIO VE TAREA (status: waiting_for_acceptance)
   ↓
5. DECISIÓN
   ├─→ ACEPTAR
   │     ↓
   │   Timer inicia (si hay timeLimit)
   │     ↓
   │   status: on_the_way
   │     ↓
   │   LLEGA AL SITIO
   │     ↓
   │   status: on_site
   │     ↓
   │   COMPLETAR (verificar GPS)
   │     ↓
   │   status: completed
   │
   └─→ RECHAZAR
         ↓
       status: rejected
       Notificar admin
```

---

## 📊 **Utilidades y Helpers**

### **Manejo de Notificaciones:**
```javascript
let notificationUtil;
try {
  notificationUtil = require('../utils/notification.util');
} catch (error) {
  // Fallback si módulo no existe
  notificationUtil = {
    notifyAdminActivity: () => Promise.resolve({ success: false }),
    notifyUser: () => Promise.resolve({ success: false })
  };
}
```
- **Graceful fallback**: Si no hay módulo de notificaciones
- **No blocking**: App funciona sin notificaciones

---

## 🚨 **Validaciones Críticas**

### **1. FileNumber Obligatorio:**
- Requerido en TODAS las creaciones
- Para cumplimiento administrativo

### **2. Jerarquía Admin-Empleado:**
- Admin normal → Solo sus empleados
- SuperAdmin → Cualquier usuario

### **3. Verificación GPS:**
- Para completar tareas con ubicación
- Debe estar dentro del radio especificado

### **4. Timer de Tiempo Límite:**
- Se activa al ACEPTAR, no al crear
- Marca timeExpired si se excede

---

## 📝 **Notas Importantes**

- **FileNumber crítico**: Siempre requerido
- **3 formatos de ubicación**: Para flexibilidad
- **Timer al aceptar**: No al crear tarea
- **Actividades no-blocking**: Errores no afectan operación
- **Jerarquía estricta**: Admin-empleado verificada
- **GPS orden**: [longitud, latitud] siempre

Este controlador es el **más complejo del sistema** y maneja toda la lógica de negocio crítica de las tareas.
