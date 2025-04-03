# Task Manager App

A React Native mobile application for managing tasks with location-based features.

## Features

- Add and delete tasks
- Location permission handling
- Map integration
- Historial de ubicaciones
- Gestión de usuarios

## Technologies Used

- React Native
- Expo
- React Native Maps
- Expo Location
- MongoDB

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd app-task

# Install dependencies
npm install

# Start the development server
npm start
```

## Configuración para Android

Para que el mapa funcione correctamente en Android, necesitas configurar una API Key de Google Maps:

1. Ve a la [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Maps para Android
4. Crea una clave de API con restricciones para Android
5. Abre el archivo `app.json` en la raíz del proyecto
6. Reemplaza `"TU_CLAVE_API_GOOGLE_MAPS_AQUI"` con tu clave de API en la sección:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "TU_CLAVE_API_GOOGLE_MAPS_AQUI"
       }
     }
   }
   ```

## Conexión al Backend

La aplicación se conecta a un servidor backend MongoDB. Asegúrate de que el servidor esté en ejecución en la dirección IP y puerto correctos (por defecto: 127.0.0.1:5555).

## Usage

The app will request location permissions when first launched. After granting permissions, you can add tasks using the input field at the top of the screen and delete them by tapping the delete button next to each task.

## License

MIT