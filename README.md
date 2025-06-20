# ManageTime

Una aplicación móvil desarrollada con React Native para gestionar tareas y monitorear ubicaciones de usuarios en tiempo real.

## Características

- Gestión de tareas (crear, asignar, completar, eliminar)
- Seguimiento de ubicación en tiempo real
- Historial de ubicaciones con visualización en mapa
- Gestión de usuarios (administradores y usuarios regulares)
- Estadísticas y reportes de actividad
- Interfaz adaptada para iOS y Android

## Tecnologías Utilizadas

- **Frontend**: React Native, Expo, React Navigation
- **Mapas**: React Native Maps, Google Maps API
- **Backend**: Node.js, Express
- **Base de datos**: MongoDB
- **Autenticación**: JWT (JSON Web Tokens)

## Requisitos Previos

- Node.js (v14 o superior)
- MongoDB (v4.4 o superior)
- Expo CLI (`npm install -g expo-cli`)
- Un dispositivo Android o emulador

## Configuración del Proyecto

### 1. Clonar el Repositorio

```bash
# Clonar el repositorio
git clone https://github.com/Chonees/manageTime.git

# Navegar al directorio del proyecto
cd manageTime
```

### 2. Configurar el Backend

```bash
# Navegar al directorio del backend
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
# (Asegúrate de que el archivo .env contiene las configuraciones correctas)
# PORT=5555
# MONGODB_URI=mongodb://127.0.0.1:27017/manageTime
# JWT_SECRET=m4n4g3T1m3_S3cur3_K3y_2025_XYZ_9876543210
# JWT_EXPIRES_IN=7d

# Iniciar el servidor backend
npm start
```

El servidor backend se ejecutará en `http://localhost:5555` por defecto.

### 3. Configurar el Frontend

```bash
# Volver al directorio principal (si estás en el directorio backend)
cd ..

# Instalar dependencias
npm install

# Configurar variables de entorno
# (Asegúrate de que el archivo .env contiene la API key de Google Maps)
# GOOGLE_MAPS_API_KEY=AIzaSyDGqyJR4KZRJt9qRLmeGjdlgIBt_nb7Kqw

# Iniciar la aplicación
npm start
```

## Ejecutar la Aplicación en un Dispositivo Android

### Opción 1: Usando Expo Go (Recomendado para pruebas)

1. **Instala la aplicación Expo Go** en tu dispositivo Android desde Google Play Store.

2. **Conecta tu dispositivo a la misma red WiFi** que tu computadora.

3. **Inicia el servidor de desarrollo** (si no lo has hecho ya):
   ```bash
   npm start
   ```

4. **Escanea el código QR** que aparece en la terminal o en la página web de Expo con la aplicación Expo Go.

5. **Importante**: Debes modificar la URL de la API en `src/services/platform-config.js` para que apunte a la IP de tu computadora en la red local (no localhost):
   ```javascript
   config: {
     apiUrl: 'http://192.168.X.X:5555',  // Reemplaza con la IP de tu computadora
     // ...
   }
   ```

### Opción 2: Usando un cable USB (Depuración)

1. **Habilita las opciones de desarrollador** en tu dispositivo Android:
   - Ve a Configuración > Acerca del teléfono
   - Toca "Número de compilación" 7 veces para habilitar las opciones de desarrollador
   - Regresa a Configuración > Sistema > Opciones de desarrollador
   - Activa "Depuración USB"

2. **Conecta tu dispositivo a la computadora** mediante un cable USB.

3. **Verifica que tu dispositivo sea reconocido**:
   ```bash
   adb devices
   ```

4. **Inicia la aplicación en modo de desarrollo**:
   ```bash
   npm run android
   ```

## Solución de Problemas Comunes

### Problemas de Conexión

Si experimentas problemas de conexión entre la aplicación móvil y el backend:

1. **Verifica que el backend esté ejecutándose** correctamente.

2. **Asegúrate de que la URL de la API sea correcta** en `src/services/platform-config.js`:
   - Debe ser la dirección IP de tu computadora en la red local, no "localhost" o "127.0.0.1"
   - El puerto debe ser 5555 (o el que hayas configurado)

3. **Comprueba la conectividad** usando la pantalla de diagnóstico en la aplicación.

4. **Verifica que no haya firewalls** bloqueando la conexión.

### Problemas con el Mapa en Android

Si el mapa no se muestra correctamente en Android:

1. **Verifica que la API key de Google Maps** esté correctamente configurada en:
   - El archivo `.env` en la raíz del proyecto
   - El archivo `app.json` en la sección de configuración de Android

2. **Asegúrate de que la API de Google Maps para Android** esté habilitada en la consola de Google Cloud.

## Usuarios Predeterminados

La aplicación incluye un usuario administrador predeterminado:

- **Usuario**: cristian
- **Contraseña**: Password123
- **Rol**: Administrador

## Licencia

MIT