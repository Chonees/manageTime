import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys with platform-specific prefixes to avoid conflicts
const STORAGE_KEYS = {
  SAVED_LOCATIONS: `${Platform.OS}_saved_locations`
};

/**
 * Component for selecting a saved location
 * @param {Object} props Component props
 * @param {boolean} props.visible Whether the selector is visible
 * @param {Function} props.onClose Function to call when the selector is closed
 * @param {Function} props.onSelect Function to call when a location is selected
 * @returns {JSX.Element} Component JSX
 */
const SavedLocationsSelector = ({ visible, onClose, onSelect }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);

  // Load saved locations when the component becomes visible
  useEffect(() => {
    if (visible) {
      loadSavedLocations();
    }
  }, [visible]);

  // Load saved locations from storage
  const loadSavedLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading saved locations from storage');
      
      // Get locations directly from AsyncStorage
      const locationsJson = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS);
      console.log('Locations JSON from storage:', locationsJson);
      
      if (locationsJson) {
        try {
          const locations = JSON.parse(locationsJson);
          console.log(`Retrieved ${locations.length} saved locations`);
          
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
          setLocations(validLocations);
        } catch (parseError) {
          console.error('Error parsing saved locations:', parseError);
          setError('Error parsing saved locations');
          setLocations([]);
        }
      } else {
        console.log('No saved locations found in local storage');
        setLocations([]);
      }
    } catch (error) {
      console.error('Error loading saved locations:', error);
      setError(error.message || 'Error loading saved locations');
    } finally {
      setLoading(false);
    }
  };

  // Handle location selection
  const handleSelectLocation = (location) => {
    console.log('Selected location:', JSON.stringify(location, null, 2));
    
    try {
      // Validate location before passing it to the parent component
      if (!location || !location.location || !location.location.coordinates) {
        throw new Error('Invalid location selected');
      }
      
      onSelect(location);
      onClose();
    } catch (error) {
      console.error('Error selecting location:', error);
      Alert.alert(
        'Error',
        'Could not select this location. Please try another one.',
        [{ text: 'OK' }]
      );
    }
  };

  // Render a location item
  const renderLocationItem = ({ item }) => {
    // Check if location data is valid
    const hasValidCoordinates = item && 
      item.location && 
      item.location.coordinates && 
      Array.isArray(item.location.coordinates) && 
      item.location.coordinates.length >= 2 &&
      typeof item.location.coordinates[0] === 'number' &&
      typeof item.location.coordinates[1] === 'number';
    
    // Format coordinates safely
    const formatCoordinate = (value) => {
      if (value === null || value === undefined || isNaN(value)) {
        return '0.000000';
      }
      return value.toFixed(6);
    };
    
    // Get coordinates safely
    const longitude = hasValidCoordinates ? item.location.coordinates[0] : 0;
    const latitude = hasValidCoordinates ? item.location.coordinates[1] : 0;
    
    return (
      <TouchableOpacity
        style={styles.locationItem}
        onPress={() => handleSelectLocation(item)}
      >
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name || 'Unnamed Location'}</Text>
          <Text style={styles.locationDetails}>
            {formatCoordinate(latitude)}, {formatCoordinate(longitude)} • {(item.radius || 0).toFixed(1)} km
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  // Add a key extractor that doesn't rely on _id
  const keyExtractor = (item, index) => {
    return item._id || `location-${index}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('selectSavedLocation')}</Text>
          <View style={styles.headerRight} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>{t('loadingSavedLocations')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={40} color="#D32F2F" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadSavedLocations}
            >
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : locations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location" size={40} color="#999" />
            <Text style={styles.emptyText}>{t('noSavedLocations')}</Text>
            <Text style={styles.emptySubtext}>{t('saveLocationHint')}</Text>
          </View>
        ) : (
          <FlatList
            data={locations}
            renderItem={renderLocationItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8'
  },
  closeButton: {
    padding: 5
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  headerRight: {
    width: 34
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4A90E2',
    borderRadius: 5
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  listContent: {
    padding: 15
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15
  },
  locationInfo: {
    flex: 1
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  locationDetails: {
    marginTop: 5,
    fontSize: 14,
    color: '#666'
  },
  separator: {
    height: 1,
    backgroundColor: '#e1e4e8'
  }
});

export default SavedLocationsSelector;
