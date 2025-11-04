# 📱 MANAGETIME PROJECT - Documentación Completa del Sistema

## 📋 **¿Qué es el Proyecto ManageTime?**

ManageTime es un **sistema integral de gestión de tiempo y tareas** para entornos corporativos que combina aplicación móvil (React Native/Expo) con panel de administración web. Automatiza el control de horarios, gestión de tareas, seguimiento de ubicación y análisis de productividad mediante geolocalización y tecnologías modernas de desarrollo.

## 🎯 **Propósito del Sistema**

- **Automatizar control horario** de empleados con geolocalización
- **Gestionar tareas** con temporizador, notas de voz y plantillas
- **Rastrear ubicaciones** en tiempo real con mapas interactivos
- **Panel administrativo completo** para supervisión y análisis
- **Asistente de voz inteligente** para registro de notas
- **Soporte multiidioma** (español/inglés)
- **Interfaz adaptativa** con tema oscuro moderno

---

## 🏗️ **Arquitectura del Sistema**

### **📊 Flujo de Datos Completo:**
```
Mobile App → API REST → MongoDB → Admin Panel
    ↓          ↓           ↓          ↓
[React Native] [Express] [Mongoose] [React Web]
    ↓          ↓           ↓          ↓
[Expo SDK 52] [JWT Auth] [Atlas/Local] [Google Maps]
```

### **🔄 Integración Completa:**
- **Frontend Móvil**: React Native + Expo para iOS/Android
- **Backend API**: Node.js + Express con autenticación JWT
- **Base de Datos**: MongoDB con schemas Mongoose
- **Panel Admin**: React web con Google Maps y analytics
- **Deployment**: Heroku (backend) + Expo Go (mobile)

### **🔐 Sistema de Autenticación:**
```
Usuario → Login → JWT Token → API Access
   ↓        ↓         ↓           ↓
[Email]  [Password] [7 días]  [Protected Routes]
```

---

## 🗂️ **Estructura de Archivos Completa**

### **📱 Frontend Mobile (React Native/Expo):**
```
📂 ManageTime/
├── 📱 App.js                      # Punto de entrada principal
├── 🎨 app.json                    # Configuración Expo SDK 52
├── ⚙️ app.config.js               # Config dinámica para ambientes
├── 📦 package.json                # Dependencias y scripts
├── 🔐 .env                        # Variables de entorno
├── 🌐 babel.config.js            # Configuración Babel
├── 📂 src/                       # Código fuente principal
│   ├── 📂 screens/              # Pantallas de la app
│   │   ├── 🏠 DashboardScreen.js         # Pantalla principal
│   │   ├── 📋 TaskScreen.js              # Gestión de tareas
│   │   ├── 📝 TaskDetailsScreen.js       # Detalles de tarea
│   │   ├── 📍 LocationTrackingScreen.js  # Rastreo GPS
│   │   ├── 🗺️ LocationHistoryScreen.js  # Historial ubicaciones
│   │   ├── 🎤 VoiceAssistantScreen.js    # Asistente de voz
│   │   ├── 👥 AdminPanelScreen.js        # Panel admin móvil
│   │   ├── 🧪 ApiTestScreen.js           # Diagnóstico API
│   │   ├── 📂 auth/                      # Autenticación
│   │   │   ├── 🔓 loginScreen1/          
│   │   │   │   ├── LoginScreen.js        # Pantalla login
│   │   │   │   └── loginScreenStyles.js  # Estilos login
│   │   │   ├── 📝 RegisterScreen.js      # Registro usuarios
│   │   │   └── 👋 WelcomeScreen.js       # Bienvenida
│   │   └── 📂 admin/                     # Administración
│   │       ├── 📊 AdminDashboardScreen.js    # Dashboard admin
│   │       ├── 📈 AdminActivitiesScreen.js   # Actividades
│   │       └── 👤 UserManagementScreen.js    # Gestión usuarios
│   ├── 📂 components/           # Componentes reutilizables
│   │   ├── 🎯 Header.js                  # Cabecera app
│   │   ├── 🌍 LanguageToggle.js          # Cambio idioma
│   │   ├── 📍 LocationComponent.js       # Componente GPS
│   │   ├── 🗺️ MapComponent.js           # Mapa interactivo
│   │   ├── ⏱️ TaskTimer.js              # Temporizador tareas
│   │   ├── 📝 TaskForm.js                # Formulario tareas
│   │   ├── 📋 TaskItem.js                # Item de tarea
│   │   ├── ✅ TaskConfirmationModal.js   # Modal confirmación
│   │   ├── 📑 TaskTemplateSelector.js    # Selector plantillas
│   │   ├── 📍 SavedLocationsSelector.js  # Ubicaciones guardadas
│   │   ├── 🎯 LocationRadiusSelector.js  # Radio ubicación
│   │   └── 📊 AdminActivityList.js       # Lista actividades
│   ├── 📂 context/              # Contextos React
│   │   ├── 🔐 AuthContext.js            # Contexto autenticación
│   │   ├── 🌍 LanguageContext.js        # Contexto idiomas
│   │   ├── 📍 LocationTrackingContext.js # Contexto GPS
│   │   └── 🎨 ThemeContext.js           # Contexto tema
│   ├── 📂 services/             # Servicios API
│   │   ├── 🌐 api.js                    # API principal
│   │   ├── 📍 api-locations.js          # API ubicaciones
│   │   ├── 🗺️ platform-config.js       # Config plataforma
│   │   ├── 📍 location-service.js       # Servicio GPS
│   │   └── 🔍 map-diagnostic.js         # Diagnóstico mapas
│   ├── 📂 navigation/           # Navegación
│   │   └── 🧭 AppNavigator.js          # Navigator principal
│   ├── 📂 assets/               # Recursos
│   │   └── 📂 sounds/                   # Sonidos
│   │       └── 🔊 micro.mp3            # Sonido micrófono
│   └── 📂 utils/                # Utilidades
│       └── 📊 mockData.js              # Datos de prueba
│
├── 📂 backend/                  # Backend Node.js
│   ├── 🚀 server.js                     # Servidor Express
│   ├── 📦 package.json                  # Dependencias backend
│   ├── 🔐 .env                         # Variables entorno
│   ├── 📂 config/                      # Configuración
│   │   └── 🗃️ database.js             # Config MongoDB
│   ├── 📂 models/                      # Modelos Mongoose
│   │   ├── 👤 user.model.js           # Modelo usuario
│   │   ├── 📋 task.model.js           # Modelo tarea
│   │   ├── 📍 location.model.js       # Modelo ubicación
│   │   ├── 📊 activity.model.js       # Modelo actividad
│   │   └── 📝 note.model.js           # Modelo notas
│   ├── 📂 controllers/                 # Controladores
│   │   ├── 🔐 auth.controller.js      # Control auth
│   │   ├── 👤 user.controller.js      # Control usuarios
│   │   ├── 📋 task.controller.js      # Control tareas
│   │   ├── 📍 location.controller.js  # Control ubicaciones
│   │   └── 📊 activity.controller.js  # Control actividades
│   ├── 📂 routes/                      # Rutas API
│   │   ├── 🔐 auth.routes.js          # Rutas auth
│   │   ├── 👤 user.routes.js          # Rutas usuarios
│   │   ├── 📋 task.routes.js          # Rutas tareas
│   │   ├── 📍 location.routes.js      # Rutas ubicaciones
│   │   └── 📊 activity.routes.js      # Rutas actividades
│   ├── 📂 middleware/                  # Middlewares
│   │   ├── 🔐 auth.middleware.js      # Verificación JWT
│   │   ├── 👑 admin.middleware.js     # Verificación admin
│   │   └── 🌐 cors.middleware.js      # Config CORS
│   └── 📂 utils/                       # Utilidades backend
│       ├── 🔐 jwt.utils.js            # Manejo JWT
│       └── 🗓️ date.utils.js          # Utilidades fecha
│
└── 📂 admin-panel/              # Panel Admin Web
    ├── 🌐 index.html                   # Página principal
    ├── 🎨 style.css                    # Estilos web
    ├── ⚡ app.js                       # JavaScript frontend
    └── 🗺️ maps.js                     # Integración Google Maps
```

---

## 🚀 **Flujo de Trabajo Completo**

### **1. Inicio de Sesión:**
```
Usuario → Email/Password → JWT Token → Dashboard
   ↓          ↓               ↓           ↓
[Login]  [Validación]    [7 días]    [Home App]
```

### **2. Gestión de Disponibilidad:**
```
"Disponible" → GPS Location → Activity Log → Admin Panel
      ↓             ↓              ↓            ↓
[Clock In]    [Coordinates]   [Database]   [Real-time Map]
```

### **3. Flujo de Tareas:**
```
Admin Crea → Usuario Recibe → Acepta → Timer → Completa
    ↓            ↓             ↓        ↓        ↓
[Template]  [Notification]  [Start]  [Track]  [Report]
```

### **4. Asistente de Voz:**
```
Activación → Grabación → Transcripción → Guardado
    ↓           ↓             ↓             ↓
["Hola"]    [Audio]      [Speech-to-Text]  [Notes]
```

### **5. Panel Administrativo:**
```
Admin Login → Dashboard → Maps + Activities + Users
     ↓           ↓              ↓
[Privileges]  [Overview]   [Real-time Data]
```

---

## 🔧 **Configuración del Sistema**



### **Configuración Expo (app.json):**
```json
{
  "expo": {
    "name": "ManageTime",
    "slug": "ManageTime",
    "version": "1.0.0",
    "sdkVersion": "52.0.0",
    "platforms": ["ios", "android", "web"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#2e2e2e"
    }
  }
}
```

---

## 💻 **Comandos de Desarrollo**

### **Frontend Mobile:**
```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npx expo start

# Iniciar con túnel (para 4G)
npx expo start --tunnel

# Limpiar caché
npx expo start --clear

# Build para producción
eas build --platform all
```

### **Backend API:**
```bash
# Instalar dependencias
cd backend && npm install

# Desarrollo local
npm run dev

# Producción
npm start

# Deploy a Heroku
git push heroku main
```

### **Panel Admin:**
```bash
# Servidor local
python -m http.server 8080

# O con Node.js
npx serve admin-panel
```

---

## 📊 **Características Principales**

### **✅ Implementadas:**
- Sistema completo de autenticación JWT
- Gestión de disponibilidad con GPS
- Creación y asignación de tareas
- Temporizador de tareas con límite de tiempo
- Plantillas de tareas reutilizables
- Asistente de voz con grabación
- Panel admin con mapa en tiempo real
- Historial de actividades completo
- Soporte multiidioma (ES/EN)
- Tema oscuro moderno
- Notificaciones push
- Modo offline con sincronización

### **🔄 En Desarrollo:**
- Reportes analíticos avanzados
- Exportación de datos a Excel/PDF
- Integración con calendarios
- Sistema de notificaciones mejorado
- Dashboard analytics con gráficos

---

## 🎨 **Esquema de Colores**
```css
/* Colores Principales */
--primary: #2e2e2e      /* Gris oscuro */
--secondary: #fff3e5    /* Crema claro */
--accent: #4CAF50       /* Verde disponible */
--danger: #FF6B6B       /* Rojo no disponible */
--background: #1a1a1a   /* Negro profundo */
--text: #ffffff         /* Blanco texto */
```

---

## 📱 **Compatibilidad**

### **Plataformas Soportadas:**
- iOS 13.0+
- Android 6.0+ (API 23+)
- Web (Chrome, Safari, Firefox, Edge)

### **Requisitos del Sistema:**
- Node.js 16+
- MongoDB 4.4+
- Expo SDK 52
- React Native 0.73.6
- React 18.2.0

---

## 🚀 **Deployment**

### **Backend (Heroku):**
```bash
heroku create managetime-backend
heroku config:set MONGODB_URI=<tu_uri_mongodb>
heroku config:set JWT_SECRET=<tu_secret>
git push heroku main
```

### **Mobile App (Expo):**
```bash
expo publish
# O para stores
eas build --platform all
eas submit
```

---

## 📄 **Licencia y Créditos**

**ManageTime** © 2025
Desarrollado con React Native, Node.js y MongoDB
Sistema de gestión de tiempo empresarial de última generación
