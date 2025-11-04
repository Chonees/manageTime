# README: backend/src/utils/logger.js - Sistema de Logging

## 📋 **¿Qué es este archivo?**
`logger.js` implementa el **sistema de logging centralizado**.

## 🎯 **Propósito**
- Logging estructurado
- Diferentes niveles (info, warn, error)
- Rotación de archivos
- Formato consistente

## 🚀 **Funciones Principales**

### **info(message, meta)**
- Logs informativos
- Operaciones normales
- Con metadata opcional

### **warn(message, meta)**
- Advertencias
- Situaciones sospechosas
- No críticas

### **error(message, error, meta)**
- Errores críticos
- Stack traces
- Para debugging

### **debug(message, meta)**
- Solo en desarrollo
- Información detallada
- Performance tracking

### **audit(action, user, meta)**
- Logs de auditoría
- Acciones sensibles
- Compliance

## 🔧 **Características**
- Winston logger
- Rotación diaria
- Formato JSON
- Niveles configurables
- Transports múltiples
