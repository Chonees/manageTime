# README: src/context/LanguageContext.js - Sistema de Internacionalización (i18n)

## 📋 **¿Qué es este archivo?**

`LanguageContext.js` es el **sistema completo de internacionalización** de ManageTime. Gestiona todas las traducciones de la aplicación en español e inglés, proporciona un contexto global para cambio de idioma en tiempo real, persiste la preferencia del usuario, y ofrece un hook `useLanguage()` para acceso fácil a las traducciones desde cualquier componente.

## 🎯 **Propósito**
- Centralizar todas las traducciones de la app
- Soportar cambio dinámico de idioma sin recargar
- Persistir preferencia de idioma en AsyncStorage
- Proporcionar función `t()` para traducciones
- Mantener consistencia de textos en toda la app
- Facilitar agregar nuevos idiomas
- Soportar interpolación de variables

## ⚡ **¿Cómo funciona?**

El contexto maneja **traducciones dinámicas**:
1. **Carga idioma** guardado de AsyncStorage
2. **Provee función t()** para obtener traducciones
3. **Cambio instantáneo** sin recargar app
4. **Interpolación** de variables en textos
5. **Fallback** a inglés si falta traducción

---

## 📖 **Estructura del Sistema**

### **Objeto de Traducciones Principales**
```javascript
export const translations = {
  en: { /* Todas las traducciones en inglés */ },
  es: { /* Todas las traducciones en español */ }
};
```

### **Contexto y Provider**
```javascript
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('es'); // Default español
  
  // Cargar idioma guardado
  useEffect(() => {
    AsyncStorage.getItem('language').then(lang => {
      if (lang) setLanguage(lang);
    });
  }, []);
  
  // Función de traducción
  const t = (key, params) => {
    let text = translations[language][key] || translations.en[key] || key;
    
    // Interpolación de variables
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{{${param}}}`, params[param]);
      });
    }
    
    return text;
  };
  
  // Cambiar idioma
  const changeLanguage = (newLang) => {
    setLanguage(newLang);
    AsyncStorage.setItem('language', newLang);
  };
  
  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

---

## 🌍 **Categorías de Traducciones**

### **1. Autenticación y Login**
| Key | Español | English |
|-----|---------|---------|
| login | Iniciar sesión | Login |
| username | Usuario | Username |
| password | Contraseña | Password |
| email | Correo electrónico | Email |
| loginButton | Iniciar sesión | Login |
| noAccount | ¿No tienes cuenta? | Don't have an account? |
| registerHere | Regístrate aquí | Register here |
| forgotPassword | ¿Olvidaste tu contraseña? | Forgot password? |
| loginError | Error al iniciar sesión | Login error |
| userNotFound | Usuario no encontrado | User not found |
| incorrectPassword | Contraseña incorrecta | Incorrect password |
| userDisabled | Usuario desactivado | User disabled |

### **2. Dashboard y Navegación**
| Key | Español | English |
|-----|---------|---------|
| welcome | Bienvenido | Welcome |
| dashboard | Panel principal | Dashboard |
| tasks | Tareas | Tasks |
| profile | Perfil | Profile |
| settings | Configuración | Settings |
| logOut | Cerrar sesión | Log Out |
| home | Inicio | Home |
| back | Atrás | Back |
| next | Siguiente | Next |
| previous | Anterior | Previous |

### **3. Gestión de Tareas**
| Key | Español | English |
|-----|---------|---------|
| createTask | Crear tarea | Create task |
| editTask | Editar tarea | Edit task |
| deleteTask | Eliminar tarea | Delete task |
| taskTitle | Título de la tarea | Task title |
| taskDescription | Descripción | Description |
| fileNumber | Número de archivo | File number |
| fileNumberRequired | El número de archivo es requerido | File number is required |
| timeLimit | Límite de tiempo | Time limit |
| selectTimeLimit | Seleccionar límite de tiempo | Select time limit |
| hours | horas | hours |
| minutes | minutos | minutes |
| noTimeLimit | Sin límite de tiempo | No time limit |

### **4. Estados de Tareas**
| Key | Español | English |
|-----|---------|---------|
| waiting_for_acceptance | Esperando aceptación | Waiting for acceptance |
| on_the_way | En camino | On the way |
| on_site | En el sitio | On site |
| completed | Completada | Completed |
| pending | Pendiente | Pending |
| inProgress | En progreso | In progress |
| rejected | Rechazada | Rejected |
| expired | Expirada | Expired |

### **5. Disponibilidad Laboral**
| Key | Español | English |
|-----|---------|---------|
| available | Disponible | Available |
| unavailable | No disponible | Unavailable |
| startWork | Disponible | Available |
| endWork | No disponible | Unavailable |
| workingSince | Disponible desde | Available since |
| clockIn | Marcar entrada | Clock in |
| clockOut | Marcar salida | Clock out |

### **6. Ubicación y GPS**
| Key | Español | English |
|-----|---------|---------|
| currentLocation | Ubicación actual | Current location |
| selectLocation | Seleccionar ubicación | Select location |
| savedLocations | Ubicaciones guardadas | Saved locations |
| addLocation | Agregar ubicación | Add location |
| locationName | Nombre del lugar | Location name |
| radius | Radio | Radius |
| meters | metros | meters |
| kilometers | kilómetros | kilometers |
| locationPermissionDenied | Permiso de ubicación denegado | Location permission denied |
| errorGettingLocation | Error obteniendo ubicación | Error getting location |
| useLastKnownLocation | Usar última ubicación conocida | Use last known location |

### **7. Panel de Administrador**
| Key | Español | English |
|-----|---------|---------|
| adminDashboard | Panel de Administrador | Admin Dashboard |
| userManagement | Gestión de usuarios | User Management |
| taskManagement | Gestión de tareas | Task Management |
| totalUsers | Total de usuarios | Total users |
| activeUsers | Usuarios activos | Active users |
| totalTasks | Total de tareas | Total tasks |
| completedTasks | Tareas completadas | Completed tasks |
| pendingTasks | Tareas pendientes | Pending tasks |
| viewAllActivities | Ver todas las actividades | View all activities |
| loggedUsers | Usuarios conectados | Logged users |
| realTimeLocationOfUsers | Ubicación en tiempo real | Real time location of users |

### **8. Actividades y Registro**
| Key | Español | English |
|-----|---------|---------|
| activity | Actividad | Activity |
| recentActivity | Actividad reciente | Recent activity |
| noRecentActivity | Sin actividad reciente | No recent activity |
| userActivities | Actividades del usuario | User activities |
| showingActivities | Mostrando {{count}} de {{total}} | Showing {{count}} of {{total}} |
| loadMore | Cargar más | Load more |
| locationEnter | Entrada a ubicación | Location entry |
| locationExit | Salida de ubicación | Location exit |
| taskComplete | Tarea completada | Task completed |
| taskCreate | Tarea creada | Task created |
| taskUpdate | Tarea actualizada | Task updated |
| taskDelete | Tarea eliminada | Task deleted |

### **9. Modo Manos Libres**
| Key | Español | English |
|-----|---------|---------|
| handsFreeMode | Modo manos libres | Hands-free mode |
| enableHandsFreeMode | Habilitar modo manos libres | Enable hands-free mode |
| voiceActivationKeywords | Palabras clave de activación | Voice activation keywords |
| enterKeyword | Ingresar palabra clave | Enter keyword |
| addKeyword | Agregar palabra | Add keyword |
| currentKeywords | Palabras actuales | Current keywords |
| voiceAssistant | Asistente de voz | Voice assistant |
| startRecording | Iniciar grabación | Start recording |
| stopRecording | Detener grabación | Stop recording |

### **10. Mensajes de Error y Validación**
| Key | Español | English |
|-----|---------|---------|
| error | Error | Error |
| success | Éxito | Success |
| warning | Advertencia | Warning |
| confirm | Confirmar | Confirm |
| cancel | Cancelar | Cancel |
| retry | Reintentar | Retry |
| loading | Cargando... | Loading... |
| pleaseWait | Por favor espera | Please wait |
| noData | Sin datos | No data |
| noResults | Sin resultados | No results |
| connectionError | Error de conexión | Connection error |
| serverError | Error del servidor | Server error |
| unknownError | Error desconocido | Unknown error |
| tryAgain | Intenta de nuevo | Try again |

### **11. Fechas y Tiempo**
| Key | Español | English |
|-----|---------|---------|
| today | Hoy | Today |
| yesterday | Ayer | Yesterday |
| tomorrow | Mañana | Tomorrow |
| daysAgo | hace {{days}} días | {{days}} days ago |
| hoursAgo | hace {{hours}} horas | {{hours}} hours ago |
| minutesAgo | hace {{minutes}} minutos | {{minutes}} minutes ago |
| secondsAgo | hace {{seconds}} segundos | {{seconds}} seconds ago |
| justNow | Justo ahora | Just now |
| date | Fecha | Date |
| time | Hora | Time |
| startDate | Fecha de inicio | Start date |
| endDate | Fecha de fin | End date |
| duration | Duración | Duration |

### **12. Confirmaciones y Modales**
| Key | Español | English |
|-----|---------|---------|
| confirmTask | Confirmar tarea | Confirm task |
| taskConfirmationQuestion | ¿Deseas aceptar esta tarea? | Do you want to accept this task? |
| accept | Aceptar | Accept |
| reject | Rechazar | Reject |
| confirmDelete | Confirmar eliminación | Confirm deletion |
| deleteConfirmation | ¿Estás seguro? Esta acción no se puede deshacer | Are you sure? This action cannot be undone |
| taskRejected | Tarea rechazada | Task rejected |
| taskRejectedMessage | Has rechazado esta tarea | You have rejected this task |

### **13. Plantillas y Guardados**
| Key | Español | English |
|-----|---------|---------|
| templates | Plantillas | Templates |
| selectTemplate | Seleccionar plantilla | Select template |
| saveAsTemplate | Guardar como plantilla | Save as template |
| templateName | Nombre de plantilla | Template name |
| noTemplates | Sin plantillas disponibles | No templates available |
| useTemplate | Usar plantilla | Use template |
| deleteTemplate | Eliminar plantilla | Delete template |
| templateSaved | Plantilla guardada | Template saved |

### **14. Exportación y Reportes**
| Key | Español | English |
|-----|---------|---------|
| exportData | Exportar datos | Export data |
| exportToExcel | Exportar a Excel | Export to Excel |
| exportToPDF | Exportar a PDF | Export to PDF |
| generating | Generando... | Generating... |
| downloadReady | Descarga lista | Download ready |
| reportGenerated | Reporte generado | Report generated |
| downloadReport | Descargar reporte | Download report |

---

## 🔄 **Uso en Componentes**

### **Importación y Uso Básico:**
```javascript
import { useLanguage } from '../context/LanguageContext';

const MyComponent = () => {
  const { t, language, changeLanguage } = useLanguage();
  
  return (
    <View>
      <Text>{t('welcome')}</Text>
      <Button 
        title={t('login')} 
        onPress={handleLogin}
      />
    </View>
  );
};
```

### **Con Interpolación de Variables:**
```javascript
// En las traducciones:
showingActivities: 'Mostrando {{count}} de {{total}} actividades'

// En el componente:
<Text>{t('showingActivities', { count: 10, total: 50 })}</Text>
// Resultado: "Mostrando 10 de 50 actividades"
```

### **Cambio de Idioma:**
```javascript
const LanguageToggle = () => {
  const { language, changeLanguage } = useLanguage();
  
  return (
    <TouchableOpacity 
      onPress={() => changeLanguage(language === 'es' ? 'en' : 'es')}
    >
      <Text>{language === 'es' ? '🇪🇸 ES' : '🇬🇧 EN'}</Text>
    </TouchableOpacity>
  );
};
```

---

## 🎨 **Componente LanguageToggle**

```javascript
const LanguageToggle = () => {
  const { language, changeLanguage } = useLanguage();
  
  return (
    <View style={styles.languageToggle}>
      <TouchableOpacity
        style={[styles.langButton, language === 'es' && styles.activeLang]}
        onPress={() => changeLanguage('es')}
      >
        <Text>🇪🇸 ES</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.langButton, language === 'en' && styles.activeLang]}
        onPress={() => changeLanguage('en')}
      >
        <Text>🇬🇧 EN</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 💾 **Persistencia de Preferencias**

```javascript
// Guardar idioma seleccionado
const changeLanguage = async (newLang) => {
  setLanguage(newLang);
  await AsyncStorage.setItem('language', newLang);
};

// Cargar idioma guardado al iniciar
useEffect(() => {
  const loadLanguage = async () => {
    const savedLang = await AsyncStorage.getItem('language');
    if (savedLang) {
      setLanguage(savedLang);
    }
  };
  loadLanguage();
}, []);
```

---

## 🚨 **Manejo de Traducciones Faltantes**

```javascript
const t = (key, params) => {
  // Fallback chain: idioma actual → inglés → key
  let text = translations[language]?.[key] 
    || translations.en?.[key] 
    || key;
  
  // Si no existe, mostrar la key para debugging
  if (text === key) {
    console.warn(`Translation missing for key: ${key}`);
  }
  
  return text;
};
```

---

## 🔧 **Agregar Nuevo Idioma**

```javascript
// 1. Agregar traducciones
export const translations = {
  en: { /* ... */ },
  es: { /* ... */ },
  pt: { // Nuevo idioma: Portugués
    welcome: 'Bem-vindo',
    login: 'Entrar',
    // ... todas las traducciones
  }
};

// 2. Agregar opción en selector
<TouchableOpacity onPress={() => changeLanguage('pt')}>
  <Text>🇧🇷 PT</Text>
</TouchableOpacity>
```

---

## 📊 **Estadísticas de Traducciones**

- **Total de keys**: ~400+
- **Idiomas soportados**: 2 (ES, EN)
- **Categorías**: 14
- **Interpolación**: Soportada con {{variable}}
- **Fallback**: EN → key
- **Persistencia**: AsyncStorage

---

## 📝 **Notas Importantes**

- **Idioma por defecto**: Español
- **Persistencia automática**: En AsyncStorage
- **Cambio instantáneo**: Sin recargar app
- **Fallback robusto**: Siempre muestra algo
- **Case sensitive**: Las keys son sensibles a mayúsculas
- **Interpolación**: Usa {{}} para variables

Este contexto es **fundamental para la experiencia multiidioma** y facilita la expansión a nuevos mercados.
