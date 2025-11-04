# README: src/context/LocationTrackingContext.js - Contexto de Tracking GPS

## 📋 **¿Qué es este archivo?**
`LocationTrackingContext.js` gestiona el **tracking GPS global** de la aplicación.

## 🎯 **Propósito**
- Estado global de tracking
- Iniciar/detener seguimiento
- Compartir ubicación entre componentes
- Gestionar permisos GPS
- Background tracking

## 🚀 **Funciones Principales**
- **startTracking()**: Inicia GPS
- **stopTracking()**: Detiene GPS
- **getCurrentLocation()**: Ubicación actual
- **isTracking**: Estado booleano
- **lastLocation**: Última conocida
- **trackingHistory**: Array de puntos

## 🔧 **Características**
- Persiste entre pantallas
- Battery-aware
- Accuracy configurable
- Error handling
- Permission management
