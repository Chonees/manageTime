# README: backend/src/controllers/savedLocation.controller.js - Controlador de Ubicaciones Guardadas

## 📋 **¿Qué es este archivo?**
`savedLocation.controller.js` gestiona **ubicaciones favoritas/guardadas** de usuarios.

## 🎯 **Propósito**
- CRUD de ubicaciones guardadas
- Gestión de favoritos
- Límite por usuario
- Ubicaciones por defecto

## 🚀 **Funciones Principales**

### **createSavedLocation**
- Guarda nueva ubicación
- Validación de nombre único
- Máximo 20 por usuario
- Coordenadas y radio

### **getUserSavedLocations**
- Lista ubicaciones del usuario
- Ordenadas por uso/nombre
- Con información completa

### **updateSavedLocation**
- Edita ubicación existente
- Solo el propietario
- Actualiza nombre/coordenadas/radio

### **deleteSavedLocation**
- Elimina ubicación guardada
- Verificación de propiedad
- No elimina si es default activa

### **setDefaultLocation**
- Marca ubicación como default
- Solo una por usuario
- Para uso rápido

## 🔧 **Características**
- Validación de propiedad
- Límites por usuario
- Nombres descriptivos
