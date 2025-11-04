# README: src/services/api.js - Servicio API Principal del Frontend

## 📋 **¿Qué es este archivo?**

`api.js` es el **servicio central de comunicación HTTP** del frontend de ManageTime. Gestiona todas las llamadas al backend, manejo de tokens JWT, reintentos, timeouts, y proporciona funciones específicas para cada endpoint. Incluye manejo especial para compatibilidad con Android usando XMLHttpRequest para operaciones críticas como login.

## 🎯 **Propósito**
- Centralizar todas las llamadas API en un solo lugar
- Manejar autenticación JWT automáticamente
- Implementar timeouts y manejo de errores robusto
- Proporcionar funciones específicas para cada operación
- Usar XMLHttpRequest para mejor compatibilidad Android
- Gestionar diferentes URLs según entorno (local/túnel/Heroku)
- Persistir tokens en AsyncStorage

## ⚡ **¿Cómo funciona?**

El servicio actúa como **capa de abstracción** entre UI y backend:
1. **Detecta entorno** (desarrollo/producción/túnel)
2. **Obtiene token JWT** de AsyncStorage
3. **Añade headers** de autenticación automáticamente
4. **Maneja timeouts** con AbortController
5. **Procesa respuestas** y errores consistentemente
6. **Usa XMLHttpRequest** para operaciones críticas

---

## 📖 **Explicación de Funciones Core**

### **Líneas 8-15: Configuración de URL Base**
```javascript
export const API_URL = getApiBaseUrl();

export const getApiUrl = () => {
  return getApiBaseUrl();
};
```
- **`getApiBaseUrl()`**: Importado de platform-config.js
- **Detecta automáticamente**: Local, LAN, túnel, o producción
- **URL dinámica**: Se adapta al entorno de ejecución

### **Líneas 18-25: Manejo de Respuestas**
```javascript
export const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }
  
  return await response.json().catch(() => ({}));
};
```
- **Validación de status**: Verifica response.ok
- **Extracción de error**: Intenta obtener mensaje del backend
- **Fallback seguro**: Retorna objeto vacío si falla parsing

### **Líneas 28-55: Fetch con Timeout (Sin Reintentos)**
```javascript
export const fetchWithRetry = async (url, options, maxRetries = null) => {
  const controller = new AbortController();
  
  const timeout = getTimeout();  // Típicamente 30000ms
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };
  
  const response = await fetch(url, fetchOptions);
  clearTimeout(timeoutId);
  
  return response;
};
```
- **Nombre misleading**: No hace reintentos (legacy)
- **AbortController**: Para cancelar requests
- **Timeout configurable**: Desde platform-config
- **Limpieza**: Cancela timeout si completa

---

## 🔐 **Autenticación y Headers**

### **Líneas 58-65: Obtener Header de Auth**
```javascript
export const getAuthHeader = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch (error) {
    return {};
  }
};
```
- **AsyncStorage**: Persistencia del token
- **Bearer format**: Estándar JWT
- **Graceful fallback**: Retorna {} si falla

### **Líneas 68-92: Crear Opciones de Fetch**
```javascript
export const createFetchOptions = async (method, body = null) => {
  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No hay token de autenticación disponible');
  }
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return options;
};
```
- **Requiere token**: Lanza error si no existe
- **JSON by default**: Content-Type siempre JSON
- **Body condicional**: Solo si se proporciona

---

## 🔑 **Función LOGIN con XMLHttpRequest (Líneas 95-180)**

### **¿Por qué XMLHttpRequest?**
```javascript
// Usar XMLHttpRequest que puede ser más estable en algunos dispositivos Android
const xhr = new XMLHttpRequest();
```
- **Problema Android**: fetch() falla en algunos dispositivos
- **XMLHttpRequest**: Más confiable para login crítico
- **Fallback robusto**: Funciona donde fetch falla

### **Implementación Detallada:**
```javascript
export const login = async (username, password) => {
  const url = `${getApiUrl()}/api/auth/login`;
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Timeout largo para login (2 minutos)
    const timeout = setTimeout(() => {
      xhr.abort();
      reject(new Error('Tiempo de espera agotado en login'));
    }, 120000);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        clearTimeout(timeout);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          // Login exitoso
          const responseData = JSON.parse(xhr.responseText);
          resolve(responseData);
        } else if (xhr.status === 403) {
          // Usuario desactivado
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.message || 'USER_DISABLED'));
        } else if (xhr.status === 404) {
          reject(new Error('USER_NOT_FOUND'));
        } else if (xhr.status === 401) {
          reject(new Error('INCORRECT_PASSWORD'));
        }
      }
    };
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ username, password }));
  });
  
  // Guardar token si login exitoso
  if (loginResult.token) {
    await AsyncStorage.setItem('token', loginResult.token);
  }
};
```

### **Manejo de Errores Específicos:**
| Status | Error Code | Significado |
|--------|------------|-------------|
| 403 | USER_DISABLED | Usuario desactivado por admin |
| 404 | USER_NOT_FOUND | Username/email no existe |
| 401 | INCORRECT_PASSWORD | Contraseña incorrecta |
| Timeout | TIMEOUT | 2 minutos sin respuesta |

---

## 📝 **Función REGISTER (Líneas 200-250)**

```javascript
export const register = async (username, password, email) => {
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al registrarse');
  }
  
  return await response.json();
};
```
- **No requiere auth**: Endpoint público
- **Validación backend**: Email/username únicos
- **No auto-login**: Usuario debe hacer login después

---

## ✅ **Función CHECK TOKEN (Líneas 260-300)**

```javascript
export const checkToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      return { valid: false };
    }
    
    const response = await fetchWithRetry(
      `${getApiUrl()}/api/auth/check-token`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return { valid: true, user: data.user };
    } else {
      await AsyncStorage.removeItem('token');
      return { valid: false };
    }
  } catch (error) {
    return { valid: false };
  }
};
```
- **Verificación al iniciar**: Valida sesión guardada
- **Limpia token inválido**: Si backend lo rechaza
- **Return consistente**: Siempre { valid, user? }

---

## 📋 **Funciones de TAREAS**

### **Obtener Tareas del Usuario:**
```javascript
export const getUserTasks = async () => {
  const authHeader = await getAuthHeader();
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/tasks/user`,
    { headers: authHeader }
  );
  
  return await handleResponse(response);
};
```

### **Crear Tarea:**
```javascript
export const createTask = async (taskData) => {
  const options = await createFetchOptions('POST', taskData);
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/tasks`,
    options
  );
  
  return await handleResponse(response);
};
```

### **Aceptar/Rechazar Tarea:**
```javascript
export const acceptTask = async (taskId) => {
  const options = await createFetchOptions('PUT');
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/tasks/${taskId}/accept`,
    options
  );
  return await handleResponse(response);
};

export const rejectTask = async (taskId) => {
  const options = await createFetchOptions('PUT');
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/tasks/${taskId}/reject`,
    options
  );
  return await handleResponse(response);
};
```

### **Actualizar Estado de Tarea:**
```javascript
export const updateTaskStatus = async (taskId, status, location = null) => {
  const body = { status };
  if (location) {
    body.location = location;
  }
  
  const options = await createFetchOptions('PUT', body);
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/tasks/${taskId}/status`,
    options
  );
  
  return await handleResponse(response);
};
```

---

## 📍 **Funciones de UBICACIÓN**

### **Guardar Ubicaciones:**
```javascript
export const saveLocations = async (locations) => {
  const options = await createFetchOptions('POST', { locations });
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/locations`,
    options
  );
  
  return await handleResponse(response);
};
```
- **Array de locations**: Para batch updates
- **Formato**: [{ latitude, longitude, timestamp, type }]

### **Obtener Historial:**
```javascript
export const getLocationHistory = async () => {
  const authHeader = await getAuthHeader();
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/locations/history`,
    { headers: authHeader }
  );
  
  return await handleResponse(response);
};
```

---

## 📊 **Funciones de ACTIVIDADES**

### **Guardar Actividad:**
```javascript
export const saveActivity = async (activity) => {
  const options = await createFetchOptions('POST', activity);
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/activities`,
    options
  );
  
  return await handleResponse(response);
};
```
- **Tipos**: clock_in, clock_out, task_accept, etc.
- **Metadata flexible**: Según tipo de actividad

### **Obtener Actividades (Admin):**
```javascript
export const getAdminActivities = async (page = 1, limit = 100, sort = '-createdAt') => {
  const authHeader = await getAuthHeader();
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/activities/admin?page=${page}&limit=${limit}&sort=${sort}`,
    { headers: authHeader }
  );
  
  return await handleResponse(response);
};
```
- **Paginación**: page y limit
- **Ordenamiento**: -createdAt para más recientes primero

---

## 👤 **Funciones de USUARIOS**

### **Obtener Usuarios (Admin):**
```javascript
export const getUsers = async () => {
  const authHeader = await getAuthHeader();
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/users`,
    { headers: authHeader }
  );
  
  return await handleResponse(response);
};
```

### **Actualizar Estado de Usuario:**
```javascript
export const updateUserStatus = async (userId, isActive) => {
  const options = await createFetchOptions('PUT', { isActive });
  const response = await fetchWithRetry(
    `${getApiUrl()}/api/users/${userId}/status`,
    options
  );
  
  return await handleResponse(response);
};
```

---

## 🔄 **Flujo de una Llamada API Típica**

```
1. UI llama función (ej: getUserTasks())
    ↓
2. Obtener token de AsyncStorage
    ↓
3. Construir headers con Bearer token
    ↓
4. Crear fetch options con timeout
    ↓
5. Hacer request con AbortController
    ↓
6. Procesar respuesta o error
    ↓
7. Retornar datos a UI
```

---

## 🚨 **Manejo de Errores**

### **Errores de Red:**
```javascript
try {
  const result = await api.getUserTasks();
} catch (error) {
  if (error.message.includes('Network')) {
    // Sin conexión
  } else if (error.message.includes('401')) {
    // Token expirado
  } else if (error.message.includes('timeout')) {
    // Timeout
  }
}
```

### **Códigos de Error Personalizados:**
- `USER_NOT_FOUND`: Usuario no existe
- `INCORRECT_PASSWORD`: Contraseña incorrecta
- `USER_DISABLED`: Usuario desactivado
- `NO_TOKEN`: Sin autenticación
- `TIMEOUT`: Tiempo agotado

---

## 🔧 **Configuración de Timeouts**

```javascript
// En platform-config.js
export const getTimeout = () => {
  if (Platform.OS === 'android') {
    return 60000; // 1 minuto para Android
  }
  return 30000; // 30 segundos para iOS/Web
};
```

### **Timeouts Especiales:**
- **Login**: 120 segundos (crítico)
- **Normal**: 30-60 segundos
- **Upload**: 180 segundos (archivos grandes)

---

## 📝 **Notas Importantes**

- **XMLHttpRequest para login**: Más confiable en Android
- **Token en AsyncStorage**: Persiste entre sesiones
- **Timeouts largos**: Para redes lentas/4G
- **Error handling específico**: Mensajes claros para UI
- **getApiUrl() dinámico**: Se adapta al entorno

Este servicio es **crítico para toda comunicación** con el backend y debe manejarse con cuidado especial para compatibilidad cross-platform.
