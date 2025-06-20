import { Platform } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// Check if Google Maps API key is configured
export const checkMapApiKey = () => {
  const apiKey = Constants.manifest?.android?.config?.googleMaps?.apiKey;
  return {
    isConfigured: !!apiKey,
    apiKey: apiKey,
    platform: Platform.OS
  };
};

// Check location permissions
export const checkLocationPermissions = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return {
      granted: status === 'granted',
      status: status
    };
  } catch (error) {
    return {
      granted: false,
      status: 'error',
      error: error.message
    };
  }
};

// Check if location services are enabled
export const checkLocationServices = async () => {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return {
      enabled: enabled
    };
  } catch (error) {
    return {
      enabled: false,
      error: error.message
    };
  }
};

// Check current device location
export const getCurrentLocation = async () => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    return {
      success: true,
      location: location.coords
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Run all diagnostics
export const runMapDiagnostics = async () => {
  const apiKeyInfo = checkMapApiKey();
  const permissionsInfo = await checkLocationPermissions();
  const locationServicesInfo = await checkLocationServices();
  const currentLocationInfo = await getCurrentLocation();

  return {
    apiKey: apiKeyInfo,
    permissions: permissionsInfo,
    locationServices: locationServicesInfo,
    currentLocation: currentLocationInfo,
    platform: Platform.OS,
    version: Platform.Version,
    isAndroid: Platform.OS === 'android',
    isIOS: Platform.OS === 'ios',
    device: Platform.constants?.Brand ? `${Platform.constants.Brand} ${Platform.constants.Model}` : 'unknown'
  };
};

export default {
  checkMapApiKey,
  checkLocationPermissions,
  checkLocationServices,
  getCurrentLocation,
  runMapDiagnostics
}; 