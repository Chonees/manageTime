# README: backend/src/models/user.model.js - Modelo de Usuario MongoDB

## 📋 **¿Qué es este archivo?**

`user.model.js` es el **modelo de datos principal** para usuarios en ManageTime. Define el esquema Mongoose para la colección de usuarios en MongoDB, incluyendo campos, validaciones, métodos personalizados y middleware para seguridad. Es la base del sistema de autenticación y autorización.

## 🎯 **Propósito**
- Definir estructura de datos de usuarios
- Implementar seguridad de contraseñas con bcrypt
- Establecer relaciones entre usuarios y admins
- Validar datos antes de guardar
- Proporcionar métodos para autenticación
- Manejar tokens push para notificaciones
- Distinguir entre usuarios, admins y superadmins

## ⚡ **¿Cómo funciona?**

Este modelo actúa como **capa de abstracción** entre la aplicación y MongoDB:
1. **Define esquema** con tipos y validaciones
2. **Hashea contraseñas** automáticamente antes de guardar
3. **Proporciona métodos** para comparar contraseñas
4. **Maneja timestamps** automáticamente
5. **Establece relaciones** con referencias a otros usuarios

---

## 📖 **Explicación Línea por Línea**

### **Líneas 1-2: Dependencias**
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
```
- **`mongoose`**: ODM para MongoDB, maneja esquemas y modelos
- **`bcryptjs`**: Librería para hashear contraseñas de forma segura

### **Líneas 4-49: Definición del Schema**
```javascript
const userSchema = new mongoose.Schema({
```

#### **Campo: username (Líneas 5-10)**
```javascript
username: {
  type: String,
  required: true,
  unique: true,
  trim: true
}
```
- **`type: String`**: Campo de texto
- **`required: true`**: Obligatorio, no puede ser null
- **`unique: true`**: No puede repetirse en la BD
- **`trim: true`**: Elimina espacios al inicio/final

#### **Campo: email (Líneas 11-17)**
```javascript
email: {
  type: String,
  required: true,
  unique: true,
  trim: true,
  lowercase: true
}
```
- **`lowercase: true`**: Convierte a minúsculas automáticamente
- **Índice único**: Para búsquedas rápidas y evitar duplicados

#### **Campo: password (Líneas 18-21)**
```javascript
password: {
  type: String,
  required: true
}
```
- **Sin minLength**: Validación en controller
- **Se hashea**: Nunca se guarda en texto plano

#### **Campo: isAdmin (Líneas 22-25)**
```javascript
isAdmin: {
  type: Boolean,
  default: false
}
```
- **Rol administrativo**: Acceso a panel admin
- **Por defecto false**: Usuarios normales

#### **Campo: isActive (Líneas 26-29)**
```javascript
isActive: {
  type: Boolean,
  default: false
}
```
- **Estado de disponibilidad**: Si está trabajando
- **Se actualiza**: Con clock_in/clock_out

#### **Campo: isSuperAdmin (Líneas 30-33)**
```javascript
isSuperAdmin: {
  type: Boolean,
  default: false
}
```
- **Rol máximo**: Permisos totales del sistema
- **Muy limitado**: Solo usuarios específicos

#### **Campo: assignedAdmin (Líneas 34-38)**
```javascript
assignedAdmin: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```
- **Referencia a otro usuario**: Admin asignado
- **`ObjectId`**: ID de MongoDB
- **`ref: 'User'`**: Para populate() en queries
- **Relación jerárquica**: Empleado → Admin

#### **Campo: pushToken (Líneas 39-42)**
```javascript
pushToken: {
  type: String,
  default: null
}
```
- **Token de notificaciones push**: Expo Push Token
- **Se actualiza**: Cuando el usuario abre la app
- **Único por dispositivo**: Para enviar notificaciones

#### **Campo: createdAt (Líneas 43-46)**
```javascript
createdAt: {
  type: Date,
  default: Date.now
}
```
- **Fecha de registro**: Automática al crear
- **`Date.now`**: Timestamp actual

### **Líneas 47-49: Opciones del Schema**
```javascript
}, {
  timestamps: true
});
```
- **`timestamps: true`**: Añade `createdAt` y `updatedAt` automáticamente
- **Nota**: Ya hay un `createdAt` manual, pero `updatedAt` es automático

---

## 🔐 **Métodos y Middleware de Seguridad**

### **Líneas 52-54: Método comparePassword**
```javascript
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```
- **Método de instancia**: Disponible en cada documento user
- **`bcrypt.compare`**: Compara texto plano con hash
- **Async**: Operación costosa computacionalmente
- **Uso**: `user.comparePassword('password123')`
- **Retorna**: Boolean (true si coincide)

### **Líneas 57-67: Middleware Pre-Save**
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```
- **`pre('save')`**: Se ejecuta ANTES de guardar
- **`isModified('password')`**: Solo hashea si cambió
- **`bcrypt.genSalt(10)`**: Salt rounds = 10 (seguridad vs velocidad)
- **`bcrypt.hash`**: Genera hash irreversible
- **Automático**: No necesita llamarse manualmente

---

## 🔄 **Flujo de Autenticación**

### **Registro de Usuario:**
```
1. Usuario envía: { username, email, password: "texto_plano" }
2. Pre-save middleware detecta password nueva
3. Genera salt con 10 rounds
4. Hashea password: "texto_plano" → "$2a$10$..."
5. Guarda en MongoDB con password hasheado
```

### **Login de Usuario:**
```
1. Usuario envía: { email, password: "texto_plano" }
2. Backend busca usuario por email
3. Llama user.comparePassword("texto_plano")
4. bcrypt compara con hash guardado
5. Retorna true/false según coincida
```

---

## 🗄️ **Estructura en MongoDB**

### **Documento de Ejemplo:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "juan.perez",
  "email": "juan@empresa.com",
  "password": "$2a$10$XYZ...", // Hash bcrypt
  "isAdmin": false,
  "isActive": true,
  "isSuperAdmin": false,
  "assignedAdmin": "507f1f77bcf86cd799439012",
  "pushToken": "ExponentPushToken[xxxxxx]",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T14:45:00.000Z",
  "__v": 0
}
```

---

## 🔄 **Relaciones con Otros Modelos**

```
User
  ├── Tasks (1:N) - Usuario tiene muchas tareas
  ├── Activities (1:N) - Usuario genera actividades
  ├── Locations (1:N) - Usuario tiene historial GPS
  ├── SavedLocations (1:N) - Usuario guarda ubicaciones
  └── User (N:1) - Empleado asignado a Admin
```

---

## 📊 **Índices y Performance**

MongoDB crea automáticamente índices para:
- `_id`: Índice primario
- `username`: Índice único
- `email`: Índice único
- `assignedAdmin`: Para búsquedas de empleados por admin

---

## 🛡️ **Validaciones y Seguridad**

### **Validaciones Automáticas:**
- Email único y en minúsculas
- Username único y sin espacios
- Password requerido y hasheado
- Campos boolean con defaults

### **Seguridad Implementada:**
- **Bcrypt salt rounds 10**: Balance seguridad/performance
- **Password nunca en texto plano**: Siempre hasheado
- **Comparación segura**: Con timing-safe compare
- **No expone hash**: Método comparePassword encapsula lógica

---

## 🚨 **Errores Comunes y Soluciones**

### **Error: Duplicate key error**
- **Causa**: Email o username ya existe
- **Solución**: Validar antes de intentar guardar

### **Error: Password comparison fails**
- **Causa**: Password se modificó sin hashear
- **Solución**: Siempre usar .save() no .update()

### **Error: Cannot read property 'comparePassword'**
- **Causa**: Documento no es instancia del modelo
- **Solución**: Usar User.findOne() no query directa

---

## 💡 **Mejores Prácticas**

```javascript
// ✅ CORRECTO - Crear usuario
const user = new User({
  username: 'juan',
  email: 'juan@email.com',
  password: 'password123' // Se hashea automáticamente
});
await user.save();

// ✅ CORRECTO - Verificar password
const user = await User.findOne({ email });
const isValid = await user.comparePassword(password);

// ❌ INCORRECTO - No usar update para passwords
await User.updateOne({ _id }, { password: 'new123' }); // NO SE HASHEA!

// ✅ CORRECTO - Actualizar password
const user = await User.findById(_id);
user.password = 'new123'; // Se hasheará
await user.save();
```

---

## 📝 **Notas Importantes**

- **Timestamps duplicados**: Hay `createdAt` manual y automático
- **Salt rounds 10**: Estándar de la industria
- **assignedAdmin**: Permite jerarquía organizacional
- **pushToken**: Se actualiza en cada login desde mobile
- **isActive vs isAdmin**: Estados independientes

Este modelo es **fundamental para toda la aplicación** y cambios aquí afectan autenticación, autorización y relaciones de datos.
