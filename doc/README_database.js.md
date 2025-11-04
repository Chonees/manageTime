# README: backend/src/config/database.js - Configuración de Base de Datos

## 📋 **¿Qué es este archivo?**
`database.js` maneja la **conexión con MongoDB**.

## 🎯 **Propósito**
- Configurar conexión MongoDB
- Gestionar reconexión
- Configurar opciones
- Manejar errores

## ⚙️ **Configuración**
```javascript
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10
});
```

## 🔧 **Características**
- Auto-reconexión
- Connection pooling
- Event listeners
- Error handling
- Graceful shutdown
