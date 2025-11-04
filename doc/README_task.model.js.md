# README: backend/src/models/task.model.js - Modelo de Tareas MongoDB

## 📋 **¿Qué es este archivo?**

`task.model.js` es el **modelo central de tareas** en ManageTime. Define el esquema Mongoose para las tareas laborales, incluyendo geolocalización, límites de tiempo, modo manos libres, múltiples usuarios asignados y estados de flujo de trabajo. Soporta búsquedas geoespaciales mediante índices 2dsphere de MongoDB.

## 🎯 **Propósito**
- Definir estructura completa de tareas laborales
- Manejar asignación múltiple de usuarios
- Implementar geolocalización con radio de acción
- Gestionar estados del flujo de trabajo
- Controlar límites de tiempo y expiración
- Soportar modo manos libres con keywords
- Mantener compatibilidad con código legacy

## ⚡ **¿Cómo funciona?**

El modelo gestiona el **ciclo de vida completo** de una tarea:
1. **Creación** con datos y ubicación
2. **Asignación** a uno o múltiples usuarios
3. **Estados** desde espera hasta completado
4. **Tracking** de tiempos y ubicación
5. **Expiración** automática por tiempo límite
6. **Búsquedas geoespaciales** por proximidad

---

## 📖 **Explicación Campo por Campo**

### **Líneas 4-8: fileNumber - Número de Archivo**
```javascript
fileNumber: {
  type: String,
  required: true,
  trim: true
}
```
- **Identificador administrativo**: Número de expediente/archivo
- **Obligatorio**: Requerido por normativa empresarial
- **Único por tarea**: Para tracking administrativo

### **Líneas 9-13: title - Título**
```javascript
title: {
  type: String,
  required: true,
  trim: true
}
```
- **Nombre descriptivo**: Lo que ve el usuario
- **Campo principal**: Se muestra en listas y notificaciones

### **Líneas 14-18: description - Descripción**
```javascript
description: {
  type: String,
  trim: true,
  default: ''
}
```
- **Detalles adicionales**: Instrucciones específicas
- **Opcional**: Puede estar vacío

### **Líneas 23-27: status - Estado del Flujo**
```javascript
status: {
  type: String,
  enum: ['waiting_for_acceptance', 'on_the_way', 'on_site', 'completed'],
  default: 'waiting_for_acceptance'
}
```
- **Estados del workflow**:
  - `waiting_for_acceptance`: Esperando que usuario acepte
  - `on_the_way`: Usuario en camino a ubicación
  - `on_site`: Usuario en el sitio trabajando
  - `completed`: Tarea finalizada

### **Líneas 28-36: Usuarios Asignados**
```javascript
userIds: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}],
// Mantener userId para compatibilidad
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
}
```
- **`userIds`**: Array para múltiples usuarios (nuevo)
- **`userId`**: Usuario único (legacy, compatibilidad)
- **Doble sistema**: Migración gradual de single a multi-user

---

## 🗺️ **Sistema de Geolocalización**

### **Líneas 41-51: location - Punto GeoJSON**
```javascript
location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],  // [longitude, latitude]
    default: [0, 0]
  }
}
```
- **GeoJSON Point**: Formato estándar MongoDB
- **IMPORTANTE**: Orden es [longitud, latitud]
- **Índice 2dsphere**: Para búsquedas por proximidad

### **Líneas 52-57: radius - Radio de Acción**
```javascript
radius: {
  type: Number,
  default: 1.0,  // kilómetros
  min: 0.1,
  max: 50
}
```
- **Área de trabajo**: Radio en kilómetros
- **Validación GPS**: Usuario debe estar dentro para completar
- **Límites**: Entre 100 metros y 50 km

### **Líneas 58-62: locationName - Nombre del Lugar**
```javascript
locationName: {
  type: String,
  trim: true,
  default: ''
}
```
- **Descripción legible**: "Oficina Central", "Planta Norte"
- **Para UI**: Mostrar nombre en lugar de coordenadas

---

## 🎤 **Características de Voz**

### **Líneas 63-66: handsFreeMode - Modo Manos Libres**
```javascript
handsFreeMode: {
  type: Boolean,
  default: false
}
```
- **Activación por voz**: Para trabajos que requieren manos libres
- **Integración**: Con asistente de voz

### **Líneas 67-71: keywords - Palabras Clave**
```javascript
keywords: {
  type: String,
  trim: true,
  default: ''  // Separadas por comas
}
```
- **Comandos de voz**: "iniciar inspección, comenzar mantenimiento"
- **Formato**: String con palabras separadas por comas
- **Uso**: Activación por comando de voz

---

## ⏱️ **Control de Tiempo**

### **Líneas 72-74: startedAt - Inicio de Tarea**
```javascript
startedAt: {
  type: Date
}
```
- **Timestamp de inicio**: Cuando usuario acepta/inicia
- **Para cálculos**: Duración total de la tarea

### **Líneas 75-79: timeLimit - Límite de Tiempo**
```javascript
timeLimit: {
  type: Number,
  min: 1,
  default: 0  // minutos
}
```
- **Duración máxima**: En minutos
- **0 = sin límite**: Tarea sin restricción temporal
- **Alerta**: Notifica cuando se acerca el límite

### **Líneas 80-83: timeLimitSet - Momento de Activación**
```javascript
timeLimitSet: {
  type: Date,
  default: null
}
```
- **Cuándo se activó**: El temporizador
- **null = no iniciado**: Timer no ha comenzado
- **Se establece**: Cuando usuario acepta tarea

### **Líneas 84-87: timeExpired - Expiración**
```javascript
timeExpired: {
  type: Boolean,
  default: false
}
```
- **Marca de expiración**: Si venció el tiempo límite
- **Trigger**: Actualización automática o manual

---

## 🚫 **Estados de Aceptación/Rechazo**

### **Líneas 88-99: Tracking de Decisiones**
```javascript
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
```
- **rejected**: Si la tarea fue rechazada
- **acceptedAt**: Timestamp de aceptación
- **rejectedAt**: Timestamp de rechazo
- **Auditoría**: Para reportes y análisis

---

## 🔄 **Transformaciones JSON**

### **Líneas 102-130: toJSON Transform**
```javascript
toJSON: { 
  virtuals: true,
  transform: function(doc, ret) {
    // Convertir IDs a strings
    if (ret._id) ret._id = ret._id.toString();
    
    // Procesar userId (compatibilidad)
    if (ret.userId && typeof ret.userId === 'object' && ret.userId._id) {
      ret.userId._id = ret.userId._id.toString();
    }
    
    // Procesar array userIds
    if (ret.userIds && Array.isArray(ret.userIds)) {
      ret.userIds = ret.userIds.map(user => {
        // Convertir ObjectIds a strings
      });
    }
    
    return ret;
  }
}
```
- **Normalización de IDs**: ObjectId → String
- **Compatibilidad**: Frontend espera strings
- **Populate support**: Maneja objetos poblados

---

## 🌍 **Índice Geoespacial**

### **Línea 134: Índice 2dsphere**
```javascript
taskSchema.index({ location: '2dsphere' });
```
- **Búsquedas por proximidad**: $near, $geoWithin
- **Performance**: Optimiza queries geoespaciales
- **Requisito**: Para usar operadores geo de MongoDB

### **Ejemplo de Query Geoespacial:**
```javascript
// Buscar tareas dentro de 5km
const nearbyTasks = await Task.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.9667, 40.78]
      },
      $maxDistance: 5000  // metros
    }
  }
});
```

---

## 🔄 **Flujo de Vida de una Tarea**

```
1. CREACIÓN (Admin)
   ↓
2. ASIGNACIÓN → userIds[] / userId
   ↓
3. NOTIFICACIÓN → Push notification
   ↓
4. ESPERA → status: 'waiting_for_acceptance'
   ↓
5. DECISIÓN
   ├─→ ACEPTAR → acceptedAt = now, timeLimitSet = now
   │     ↓
   │   EN CAMINO → status: 'on_the_way'
   │     ↓
   │   EN SITIO → status: 'on_site'
   │     ↓
   │   COMPLETAR → status: 'completed', completed: true
   │
   └─→ RECHAZAR → rejected: true, rejectedAt = now
```

---

## 📊 **Consultas Comunes**

```javascript
// Tareas pendientes de un usuario
const pendingTasks = await Task.find({
  $or: [
    { userId: userId },
    { userIds: userId }
  ],
  completed: false,
  rejected: false
});

// Tareas cerca de una ubicación
const nearbyTasks = await Task.find({
  location: {
    $geoWithin: {
      $centerSphere: [[lng, lat], radius / 6378.1]
    }
  }
});

// Tareas expiradas
const expiredTasks = await Task.find({
  timeExpired: true,
  completed: false
});
```

---

## 🚨 **Validaciones y Reglas de Negocio**

### **Validaciones del Modelo:**
- fileNumber obligatorio
- title obligatorio  
- status debe ser valor enum válido
- radius entre 0.1 y 50 km
- timeLimit mínimo 1 minuto si se establece

### **Reglas de Negocio (en controllers):**
- No completar si fuera del radio
- Expirar automáticamente por tiempo
- No aceptar si ya rechazada
- Solo admin puede crear tareas

---

## 💾 **Documento de Ejemplo en MongoDB**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "fileNumber": "EXP-2025-001",
  "title": "Inspección de válvulas sector norte",
  "description": "Revisar presión y estado general",
  "completed": false,
  "status": "on_site",
  "userIds": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "userId": "507f1f77bcf86cd799439012",
  "location": {
    "type": "Point",
    "coordinates": [-58.3816, -34.6037]
  },
  "radius": 2.5,
  "locationName": "Planta Industrial Norte",
  "handsFreeMode": true,
  "keywords": "iniciar inspección, comenzar revisión",
  "timeLimit": 120,
  "timeLimitSet": "2025-01-15T10:30:00.000Z",
  "timeExpired": false,
  "startedAt": "2025-01-15T10:30:00.000Z",
  "acceptedAt": "2025-01-15T10:25:00.000Z",
  "rejected": false,
  "createdAt": "2025-01-15T09:00:00.000Z",
  "updatedAt": "2025-01-15T11:45:00.000Z"
}
```

---

## 📝 **Notas Importantes**

- **Coordenadas GeoJSON**: [longitud, latitud] NO [latitud, longitud]
- **Doble sistema usuarios**: userIds (nuevo) + userId (legacy)
- **Índice 2dsphere**: Necesario para queries geoespaciales
- **Transform toJSON**: Crítico para compatibilidad frontend
- **timeLimit en minutos**: Frontend debe convertir a ms

Este modelo es **el núcleo del sistema de gestión de tareas** y su correcta implementación es crítica para el funcionamiento de la aplicación.
