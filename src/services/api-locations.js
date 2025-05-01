import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApiUrl, createFetchOptions, handleResponse, fetchWithRetry } from './api';

// Storage keys with platform-specific prefixes to avoid conflicts
const STORAGE_KEYS = {
  SAVED_LOCATIONS: `${Platform.OS}_saved_locations`
};

/**
 * Get auth token from AsyncStorage
 * @returns {Promise<string|null>} The authentication token or null if not found
 */
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Get saved locations from the backend
 * @returns {Promise<Array>} Array of saved locations
 */
export const getSavedLocations = async () => {
  try {
    console.log('Loading saved locations from backend');
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const url = `${getApiUrl()}/api/saved-locations`;
    console.log('Fetching saved locations from backend:', url);
    
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const locations = await handleResponse(response);
    console.log(`Retrieved ${locations.length} saved locations from backend`);
    
    // Actualizar el cache local con los datos del backend
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(locations));
      console.log('Updated local cache with backend data');
    } catch (storageError) {
      console.warn('Could not update local cache, but locations were retrieved from database:', storageError);
    }
    
    return locations;
  } catch (error) {
    console.error('Error loading saved locations from backend:', error);
    
    // Solo usamos almacenamiento local como respaldo en caso de error de red
    console.warn('Trying to load from local cache as fallback');
    try {
      const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
      if (locationsJson) {
        const cachedLocations = JSON.parse(locationsJson);
        console.log(`Using ${cachedLocations.length} locations from local cache as fallback`);
        return cachedLocations;
      }
    } catch (localError) {
      console.error('Could not load from local cache either:', localError);
    }
    
    // Si no hay datos en caché local, devolver array vacío
    console.log('No locations available offline, returning empty array');
    return [];
  }
};

/**
 * Get saved locations from local storage as fallback
 * @returns {Promise<Array>} Array of saved locations from local storage
 */
const getFallbackLocations = async () => {
  try {
    const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
    if (locationsJson) {
      const locations = JSON.parse(locationsJson);
      console.log(`Retrieved ${locations.length} saved locations from local storage on ${Platform.OS}`);
      return locations;
    }
    return [];
  } catch (error) {
    console.error('Error getting fallback locations:', error);
    return [];
  }
};

/**
 * Format location data for API
 * @param {Object} locationData - Location data to format
 * @returns {Object} Formatted location data
 */
const formatLocationData = (locationData) => {
  // Validar los datos antes de formatearlos
  if (!locationData || !locationData.name) {
    console.error('Location data missing name:', locationData);
    throw new Error('Location must have a name');
  }

  if (!locationData.location || !locationData.location.coordinates || 
      !Array.isArray(locationData.location.coordinates) || 
      locationData.location.coordinates.length !== 2) {
    console.error('Invalid location coordinates:', locationData);
    throw new Error('Location must have valid coordinates [longitude, latitude]');
  }

  if (typeof locationData.radius !== 'number' || locationData.radius < 0.1 || locationData.radius > 50) {
    console.error('Invalid radius:', locationData.radius);
    throw new Error('Radius must be between 0.1 and 50 kilometers');
  }

  // Asegurarse de que las coordenadas sean números
  const longitude = parseFloat(locationData.location.coordinates[0]);
  const latitude = parseFloat(locationData.location.coordinates[1]);

  if (isNaN(longitude) || isNaN(latitude)) {
    console.error('Coordinates are not valid numbers:', locationData.location.coordinates);
    throw new Error('Coordinates must be valid numbers');
  }

  // Ensure the data is in the format expected by the API
  return {
    name: locationData.name,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    radius: locationData.radius
  };
};

/**
 * Save a location to the backend with diagnostic logging
 * @param {Object} locationData - Location data to save
 * @returns {Promise<Object>} Saved location
 */
export const saveLocation = async (locationData) => {
  try {
    console.log('Saving location with name:', locationData.name);
    console.log('Original location data:', JSON.stringify(locationData));
    
    const token = await getAuthToken();
    if (!token) {
      console.error('No auth token available. User may need to log in again.');
      throw new Error('No authentication token available');
    }
    
    try {
      const formattedData = formatLocationData(locationData);
      console.log('Formatted data for API:', JSON.stringify(formattedData));
      
      const url = `${getApiUrl()}/api/saved-locations`;
      console.log('Sending request to backend:', url);
      
      // Mostrar el token (parcialmente censurado) para verificar que es válido
      console.log('Using auth token (first 10 chars):', token.substring(0, 10) + '...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });
      
      // Mostrar información detallada de la respuesta
      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);
      console.log('Response headers:', JSON.stringify(Array.from(response.headers.entries())));
      
      // Intentar leer la respuesta como texto primero para diagnóstico
      const responseText = await response.text();
      console.log('Full response from backend:', responseText);
      
      // Parsear la respuesta como JSON si es posible
      let savedLocation;
      try {
        savedLocation = JSON.parse(responseText);
        console.log('Parsed response:', savedLocation);
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        throw new Error(`Server response is not valid JSON: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error('API error response:', savedLocation);
        throw new Error(savedLocation.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      console.log('Location saved successfully to database:', savedLocation);
      
      // Verificar si la ubicación tiene un ID válido
      if (!savedLocation._id) {
        console.error('Saved location does not have a valid ID. This is unexpected.');
      } else {
        console.log('Location saved with ID:', savedLocation._id);
      }
      
      // Solo guardamos una copia en caché para rendimiento
      try {
        await updateLocalCache(savedLocation);
        console.log('Local cache updated for performance');
        
        // Para depuración, intentemos leer inmediatamente la ubicación desde el backend
        setTimeout(async () => {
          try {
            const verificationResponse = await fetch(`${url}/${savedLocation._id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (verificationResponse.ok) {
              const verification = await verificationResponse.json();
              console.log('Verification - location exists in database:', verification);
            } else {
              console.error('Verification failed - could not find saved location in database');
            }
          } catch (verificationError) {
            console.error('Error during verification:', verificationError);
          }
        }, 1000);
      } catch (cacheError) {
        console.warn('Could not update local cache, but location was saved to database:', cacheError);
      }
      
      return savedLocation;
    } catch (error) {
      console.error('Error during location save process:', error);
      
      // Verificar si es un error de red
      if (error.message && (
          error.message.includes('Network request failed') || 
          error.message.includes('Failed to fetch') || 
          error.message.includes('Network Error'))) {
        console.warn('Network error detected, attempting to save locally');
        
        try {
          const localSave = await saveToLocalStorage(locationData);
          console.log('Saved to local storage as fallback:', localSave);
          return localSave;
        } catch (localError) {
          console.error('Failed to save locally:', localError);
          throw new Error('Failed to save location: Network error and local storage fallback failed');
        }
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
};

/**
 * Save location to local storage as fallback
 * @param {Object} locationData - Location data to save
 * @returns {Promise<Object>} Saved location
 */
const saveToLocalStorage = async (locationData) => {
  // Get existing locations from local storage
  const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
  let locations = [];
  
  if (locationsJson) {
    try {
      locations = JSON.parse(locationsJson);
    } catch (parseError) {
      console.error('Error parsing existing locations, starting fresh:', parseError);
      locations = [];
    }
  }
  
  // Create a new location object with a unique ID
  const newLocation = {
    _id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: locationData.name,
    location: locationData.location,
    radius: locationData.radius || 0.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add the new location to the array
  locations.unshift(newLocation); // Add to the beginning of the array
  
  // Save the updated locations array to local storage
  await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(locations));
  
  return newLocation;
};

/**
 * Update local cache with a location
 * @param {Object} location - Location to add/update in local cache
 */
const updateLocalCache = async (location) => {
  try {
    const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
    let locations = [];
    
    if (locationsJson) {
      locations = JSON.parse(locationsJson);
      
      // Comprobar si la ubicación ya existe en el cache
      const index = locations.findIndex(loc => loc._id === location._id);
      
      if (index !== -1) {
        // Actualizar la ubicación existente
        locations[index] = location;
      } else {
        // Añadir la nueva ubicación al inicio
        locations.unshift(location);
      }
    } else {
      // No hay ubicaciones en el cache, añadir esta
      locations = [location];
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(locations));
  } catch (error) {
    console.error('Error updating local cache:', error);
  }
};

/**
 * Update a location in the backend
 * @param {string} locationId - ID of the location to update
 * @param {Object} locationData - Updated location data
 * @returns {Promise<Object>} Updated location
 */
export const updateLocation = async (locationId, locationData) => {
  try {
    console.log(`Updating location ${locationId}`);
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const formattedData = formatLocationData(locationData);
    const url = `${getApiUrl()}/api/saved-locations/${locationId}`;
    
    console.log('Updating location in backend:', url);
    console.log('Updated data:', JSON.stringify(formattedData));
    
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formattedData)
    });
    
    const updatedLocation = await handleResponse(response);
    console.log('Location updated successfully in database');
    
    // Solo actualizamos la caché local para rendimiento
    try {
      await updateLocalCache(updatedLocation);
      console.log('Local cache updated with new location data');
    } catch (cacheError) {
      console.warn('Could not update local cache, but location was updated in database:', cacheError);
    }
    
    return updatedLocation;
  } catch (error) {
    console.error('Error updating location in database:', error);
    throw new Error(`Failed to update location in database: ${error.message}`);
  }
};

/**
 * Delete a location from the backend
 * @param {string} locationId - ID of the location to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export const deleteLocation = async (locationId) => {
  try {
    console.log(`Deleting location ${locationId}`);
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const url = `${getApiUrl()}/api/saved-locations/${locationId}`;
    console.log('Deleting location from backend:', url);
    
    const response = await fetchWithRetry(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    await handleResponse(response);
    console.log('Location deleted successfully from database');
    
    // También eliminar de la caché local para mantener sincronía
    try {
      // Obtener ubicaciones de la caché
      const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
      if (locationsJson) {
        const locations = JSON.parse(locationsJson);
        
        // Filtrar la ubicación eliminada
        const updatedLocations = locations.filter(location => location._id !== locationId);
        
        // Actualizar caché
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(updatedLocations));
        console.log('Location also removed from local cache');
      }
    } catch (cacheError) {
      console.warn('Could not update local cache, but location was deleted from database:', cacheError);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting location from database:', error);
    throw new Error(`Failed to delete location from database: ${error.message}`);
  }
};

/**
 * Delete a location from local storage
 * @param {string} locationId - ID of the location to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
const deleteFromLocalStorage = async (locationId) => {
  try {
    console.log(`Deleting location ${locationId} from local storage`);
    
    // Get existing locations
    const existingLocationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
    if (!existingLocationsJson) {
      console.log('No locations found in local storage');
      return false;
    }
    
    const existingLocations = JSON.parse(existingLocationsJson);
    
    // Filter out the location to delete
    const updatedLocations = existingLocations.filter(location => location._id !== locationId);
    
    // Save the updated array back to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(updatedLocations));
    
    console.log(`Location ${locationId} deleted from local storage`);
    return true;
  } catch (error) {
    console.error('Error deleting location from local storage:', error);
    return false;
  }
};
