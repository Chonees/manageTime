# README: backend/src/routes/report.routes.js - Rutas de Reportes

## 📋 **¿Qué es este archivo?**
`report.routes.js` define las **rutas de generación de reportes**.

## 🎯 **Propósito**
- Endpoints de reportes
- Generación PDF/Excel
- Informes programados
- Exportación de datos

## 🛣️ **Rutas Disponibles**

### **POST /api/reports/generate**
- Generar reporte personalizado
- Requiere isAdmin
- Filtros configurables

### **GET /api/reports/daily**
- Reporte diario automático
- Requiere auth
- Datos del día actual

### **GET /api/reports/weekly**
- Reporte semanal
- Resumen de productividad
- Tendencias

### **GET /api/reports/monthly**
- Informe mensual completo
- Métricas consolidadas
- Análisis comparativo

### **POST /api/reports/schedule**
- Programar reportes
- Envío automático
- Configuración de frecuencia

### **GET /api/reports/download/:id**
- Descargar reporte generado
- Link temporal
- Múltiples formatos

## 🔧 **Características**
- Generación asíncrona
- Notificación al completar
- Plantillas personalizables
