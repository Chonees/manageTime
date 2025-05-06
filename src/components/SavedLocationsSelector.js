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
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as apiLocations from '../services/api-locations';

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
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [deletingLocationId, setDeletingLocationId] = useState(null);

  // Load saved locations when the component becomes visible
  useEffect(() => {
    if (visible) {
      loadSavedLocations();
      setSearchTerm('');
    }
  }, [visible]);

  // Filter locations when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location => 
        location.name && location.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchTerm, locations]);

  // Load saved locations from storage
  const loadSavedLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(t('loadingSavedLocations'));
      
      // Use the API to get locations rather than directly from AsyncStorage
      const savedLocations = await apiLocations.getSavedLocations();
      setLocations(savedLocations);
      setFilteredLocations(savedLocations);
      
    } catch (error) {
      console.error(t('errorLoadingLocations'), error);
      setError(error.message || t('errorLoadingLocations'));
    } finally {
      setLoading(false);
    }
  };

  // Handle location selection
  const handleSelectLocation = (location) => {
    console.log(t('selectedLocation'), JSON.stringify(location, null, 2));
    
    try {
      // Validate location before passing it to the parent component
      if (!location || !location.location || !location.location.coordinates) {
        throw new Error(t('invalidLocationSelected'));
      }
      
      onSelect(location);
      onClose();
    } catch (error) {
      console.error(t('errorSelectingLocation'), error);
      Alert.alert(
        t('error'),
        t('errorSelectingLocation'),
        [{ text: t('ok') }]
      );
    }
  };

  // Handle location deletion
  const handleDeleteLocation = (locationId) => {
    Alert.alert(
      t('deleteLocation'),
      t('deleteLocationConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingLocationId(locationId);
              
              // Use the API to delete the location
              await apiLocations.deleteLocation(locationId);
              
              // Update the locations list
              setLocations(prevLocations => 
                prevLocations.filter(location => location._id !== locationId)
              );
              
              console.log(`${t('locationDeleted')} ${locationId}`);
            } catch (error) {
              console.error(t('errorDeletingLocation'), error);
              Alert.alert(
                t('error'),
                t('errorDeletingLocation'),
                [{ text: t('ok') }]
              );
            } finally {
              setDeletingLocationId(null);
            }
          }
        }
      ]
    );
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
    
    const isDeleting = deletingLocationId === item._id;
    
    return (
      <View style={styles.locationItemContainer}>
        <TouchableOpacity
          style={[styles.locationItem, { opacity: isDeleting ? 0.5 : 1 }]}
          onPress={() => handleSelectLocation(item)}
          disabled={isDeleting}
        >
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{item.name || t('unnamedLocation')}</Text>
            <Text style={styles.locationDetails}>
              {t('assignedRadius')} {(item.radius || 0).toFixed(1)} km
            </Text>
            <Text style={styles.locationDetails}>
              {t('coordinates')} {formatCoordinate(latitude)}, {formatCoordinate(longitude)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff3e5" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteLocation(item._id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff3e5" />
          ) : (
            <Ionicons name="trash-outline" size={22} color="#fff3e5" />
          )}
        </TouchableOpacity>
      </View>
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
          <Text style={styles.title}>{t('savedLocations')}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff3e5" />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#a8a8a8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchLocations')}
            placeholderTextColor="#a8a8a8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#a8a8a8" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff3e5" />
            <Text style={styles.loadingText}>{t('loadingLocations')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSavedLocations}>
              <Text style={styles.retryButtonText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredLocations.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchTerm.length > 0 ? (
              <Text style={styles.emptyText}>{t('noMatchingLocations')}</Text>
            ) : (
              <Text style={styles.emptyText}>{t('noSavedLocations')}</Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredLocations}
            renderItem={renderLocationItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2e2e2e'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#1c1c1c',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff3e5',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 243, 229, 0.3)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#fff3e5',
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff3e5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff5252',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#fff3e5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff3e5',
    textAlign: 'center',
    opacity: 0.7,
  },
  listContent: {
    padding: 10,
  },
  locationItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    overflow: 'hidden',
  },
  locationItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff3e5',
    marginBottom: 5,
  },
  locationDetails: {
    fontSize: 12,
    color: '#fff3e5',
    opacity: 0.7,
    marginBottom: 2,
  },
  deleteButton: {
    padding: 15,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
});

export default SavedLocationsSelector;
