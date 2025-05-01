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
 * Get saved locations from local storage
 * @returns {Promise<Array>} Array of saved locations
 */
export const getSavedLocations = async () => {
  try {
    console.log('Getting saved locations from local storage');
    console.log('Storage key:', STORAGE_KEYS.SAVED_LOCATIONS);
    
    // Since the backend API endpoint is not available yet, use local storage directly
    console.log('Backend API for saved locations not available yet, using local storage');
    
    // Get locations from local storage
    const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
    console.log('Locations JSON from storage:', locationsJson);
    
    if (locationsJson) {
      try {
        const locations = JSON.parse(locationsJson);
        console.log(`Retrieved ${locations.length} saved locations from local storage on ${Platform.OS}`);
        
        // Validate each location
        const validLocations = locations.filter(loc => {
          const isValid = loc && 
            loc._id && 
            loc.name && 
            loc.location && 
            loc.location.coordinates && 
            Array.isArray(loc.location.coordinates) && 
            loc.location.coordinates.length === 2;
          
          if (!isValid) {
            console.log('Found invalid location:', JSON.stringify(loc, null, 2));
          }
          
          return isValid;
        });
        
        console.log(`${validLocations.length} valid locations out of ${locations.length} total`);
        return validLocations;
      } catch (parseError) {
        console.error('Error parsing saved locations:', parseError);
        return [];
      }
    } else {
      console.log('No saved locations found in local storage');
      return [];
    }
  } catch (error) {
    console.error('Error getting saved locations:', error);
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
  // Ensure the data is in the format expected by the API
  return {
    name: locationData.name,
    location: {
      type: 'Point',
      coordinates: locationData.location.coordinates
    },
    radius: locationData.radius
  };
};

/**
 * Save a location to local storage
 * @param {Object} locationData - Location data to save
 * @returns {Promise<Object>} Saved location
 */
export const saveLocation = async (locationData) => {
  try {
    console.log('Saving location to local storage:', JSON.stringify(locationData, null, 2));
    
    // Since the backend API endpoint is not available yet, use local storage directly
    console.log('Backend API for saved locations not available yet, using local storage');
    
    // Get existing locations from local storage
    const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
    let locations = [];
    
    if (locationsJson) {
      try {
        locations = JSON.parse(locationsJson);
        console.log(`Found ${locations.length} existing locations in storage`);
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
    
    console.log('Created new location object:', JSON.stringify(newLocation, null, 2));
    
    // Add the new location to the array
    locations.unshift(newLocation); // Add to the beginning of the array
    
    // Save the updated locations array to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(locations));
    console.log(`Saved ${locations.length} locations to storage`);
    
    return newLocation;
  } catch (error) {
    console.error('Error saving location to local storage:', error);
    throw error;
  }
};

/**
 * Update a location in local storage
 * @param {string} locationId - ID of the location to update
 * @param {Object} locationData - Updated location data
 * @returns {Promise<Object>} Updated location
 */
const updateLocalStorageLocation = async (locationId, locationData) => {
  try {
    console.log(`Updating location ${locationId} in local storage`);
    
    // Get existing locations
    const existingLocationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
    if (!existingLocationsJson) {
      throw new Error('No locations found in local storage');
    }
    
    const existingLocations = JSON.parse(existingLocationsJson);
    
    // Find the location to update
    const locationIndex = existingLocations.findIndex(location => location._id === locationId);
    if (locationIndex === -1) {
      throw new Error(`Location with ID ${locationId} not found in local storage`);
    }
    
    // Update the location
    const updatedLocation = {
      ...existingLocations[locationIndex],
      ...locationData,
      updatedAt: new Date().toISOString()
    };
    
    // Replace the old location with the updated one
    const updatedLocations = [...existingLocations];
    updatedLocations[locationIndex] = updatedLocation;
    
    // Save to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(updatedLocations));
    
    console.log(`Updated location "${updatedLocation.name}" in local storage`);
    return updatedLocation;
  } catch (error) {
    console.error('Error updating location in local storage:', error);
    throw error;
  }
};

/**
 * Update a location in local storage
 * @param {string} locationId - ID of the location to update
 * @param {Object} locationData - Updated location data
 * @returns {Promise<Object>} Updated location
 */
export const updateLocation = async (locationId, locationData) => {
  try {
    console.log(`Updating location ${locationId}:`, JSON.stringify(locationData, null, 2));
    
    console.log('Backend API for saved locations not available yet, updating in local storage');
    return updateLocalStorageLocation(locationId, locationData);
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

/**
 * Delete a location from local storage
 * @param {string} locationId - ID of the location to delete
 * @returns {Promise<boolean>} True if successful
 */
const deleteLocalStorageLocation = async (locationId) => {
  try {
    console.log(`Deleting location ${locationId} from local storage`);
    
    // Get existing locations
    const existingLocationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
    if (!existingLocationsJson) {
      throw new Error('No locations found in local storage');
    }
    
    const existingLocations = JSON.parse(existingLocationsJson);
    
    // Filter out the location to delete
    const updatedLocations = existingLocations.filter(location => location._id !== locationId);
    
    // Save to local storage
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATIONS, JSON.stringify(updatedLocations));
    
    console.log(`Deleted location ${locationId} from local storage`);
    return true;
  } catch (error) {
    console.error('Error deleting location from local storage:', error);
    throw error;
  }
};

/**
 * Delete a location from local storage
 * @param {string} locationId - ID of the location to delete
 * @returns {Promise<boolean>} True if successful
 */
export const deleteLocation = async (locationId) => {
  try {
    console.log(`Deleting location ${locationId}`);
    
    console.log('Backend API for saved locations not available yet, deleting from local storage');
    return deleteLocalStorageLocation(locationId);
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};
