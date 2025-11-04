# README: app.config.js - Configuración Dinámica de Expo

## 📋 **¿Qué es este archivo?**
`app.config.js` es la **configuración dinámica de Expo** que permite usar variables de entorno.

## 🎯 **Propósito**
- Configuración basada en entorno
- Variables dinámicas
- Diferentes builds (dev/prod)
- Configuración de APIs

## ⚙️ **Configuraciones Principales**

### **Información de la App**
```javascript
export default {
  expo: {
    name: process.env.NODE_ENV === 'production' ? 'ManageTime' : 'ManageTime Dev',
    slug: 'managetime',
    version: '1.0.0',
    orientation: 'portrait'
  }
}
```

### **URLs por Entorno**
```javascript
extra: {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://managetime-backend.herokuapp.com/api'
    : 'http://localhost:5000/api',
  tunnelUrl: 'https://5000-anonymous.exp.direct/api'
}
```

### **Configuración de Build**
- Bundle identifiers dinámicos
- Íconos por entorno
- Splash screens
- Permisos específicos

### **API Keys**
- Google Maps (desde .env)
- Expo Push notifications
- Analytics keys
- Third-party services

## 🔧 **Características**
- Variables de entorno
- Configuración condicional
- Multiple environments
- Build optimization
