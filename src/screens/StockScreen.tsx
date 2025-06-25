import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  ImageSourcePropType,
  Dimensions,
  Modal,
  ImageBackground,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import FirebaseService from '../utils/firebaseConfig';
import { useNavigation } from '@react-navigation/native';

// Enable Firestore persistence for offline capabilities
try {
  firestore().settings({
    persistence: true,
    cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED
  });
  console.log('Firestore persistence enabled');
} catch (error) {
  console.error('Failed to enable Firestore persistence:', error);
}

// Theme colors
const COLORS = {
  primary: '#1a2d5a', // Navy blue
  accent: '#f57c00',  // Orange
  background: '#f8f9fa',
  card: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e1e4e8',
  danger: '#dc3545',
  success: '#28a745',
};

const { width } = Dimensions.get('window');

interface StockItem {
  id: string;
  nom: string;
  quantite: string;
  unite: string;
  datePeremption?: any;
  createdAt?: any;
  ingredientRef?: string;
  imageUrl?: string;
}

interface SliderItem {
  id: string;
  nom: string;
  imageUrl: ImageSourcePropType;
}

interface Ingredient {
  id: string;
  nom: string;
  imageUrls: string[];
  categorie?: string;
  localImagePath?: string;
}

const StockScreen: React.FC = () => {
  const navigation = useNavigation();
  const slideRef = useRef<FlatList>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [sliderItems, setSliderItems] = useState<SliderItem[]>([]);
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  
  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemExpiryDate, setNewItemExpiryDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedIngredientImage, setSelectedIngredientImage] = useState<string | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [loadingSlider, setLoadingSlider] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchingIngredients, setSearchingIngredients] = useState(false);

  // Helper function to get local image based on ingredient reference
  const getIngredientImage = (ingredientRef: string) => {
    // Map ingredient references to local image files
    // This is a basic implementation - in a real app, you would have a more robust mapping
    const imageMap: {[key: string]: any} = {
      'ing1': require('../../assets/images/ingrid/6-10.jpg'),
      'ing2': require('../../assets/images/ingrid/6-11.jpg'),
      'ing3': require('../../assets/images/ingrid/6-12.jpg'),
      'ing4': require('../../assets/images/ingrid/6-13.jpg'),
      'ing5': require('../../assets/images/ingrid/6-14.jpg'),
      'default': require('../../assets/images/ingrid/6-10.jpg'),
    };
    
    return imageMap[ingredientRef] || imageMap.default;
  };

  // Fetch slider items from public_plats collection
  useEffect(() => {
    const fetchSliderItems = async () => {
      try {
        setLoadingSlider(true);
        console.log('Setting up slider with local images...');
        
        // Use local images from assets/images/ingrid instead of remote URLs
        const localSliderItems: SliderItem[] = [
          {
            id: 'local1',
            nom: 'Plat Délicieux',
            imageUrl: require('../../assets/images/ingrid/6-10.jpg')
          },
          {
            id: 'local2',
            nom: 'Recette Savoureuse',
            imageUrl: require('../../assets/images/ingrid/6-12.jpg')
          },
          {
            id: 'local3',
            nom: 'Plat Savoureux',
            imageUrl: require('../../assets/images/ingrid/6-14.jpg')
          },
          {
            id: 'local4',
            nom: 'Recette Délicieuse',
            imageUrl: require('../../assets/images/ingrid/6-16.jpg')
          }
        ];
        setSliderItems(localSliderItems);
      } catch (error) {
        console.error('Error setting up slider:', error);
        // Use fallback data on error
        const fallbackItems: SliderItem[] = [
          {
            id: 'fallback1',
            nom: 'Plat Délicieux',
            imageUrl: require('../../assets/images/ingrid/6-10.jpg')
          },
          {
            id: 'fallback2',
            nom: 'Recette Savoureuse',
            imageUrl: require('../../assets/images/ingrid/6-12.jpg')
          }
        ];
        setSliderItems(fallbackItems);
      } finally {
        setLoadingSlider(false);
      }
    };

    fetchSliderItems();
  }, []);

  // Check authentication and fetch user stock items
  useEffect(() => {
    const checkAuthAndFetchStock = async () => {
      try {
        // First check if user is authenticated
        const currentUser = auth().currentUser;
        if (!currentUser) {
          console.log('User not authenticated');
          Alert.alert('Erreur', 'Utilisateur non connecté. Veuillez vous reconnecter.');
          setLoading(false);
          return;
        }
        
        const userId = currentUser.uid;
        console.log('User authenticated:', userId);
        
        // Try to directly access the stock collection
        try {
          const unsubscribe = firestore()
            .collection('users')
            .doc(userId)
            .collection('stock')
            .orderBy('nom', 'asc')
            .onSnapshot(
              (querySnapshot) => {
                const items: StockItem[] = [];
                querySnapshot.forEach((doc) => {
                  items.push({
                    id: doc.id,
                    ...doc.data()
                  } as StockItem);
                });
                setStockItems(items);
                setLoading(false);
              },
              (error: any) => {
                console.error('Stock subscription error:', error);
                if (error?.code === 'permission-denied') {
                  Alert.alert(
                    'Erreur d\'accès', 
                    'Vous n\'avez pas les permissions nécessaires pour accéder à votre stock.'
                  );
                } else {
                  Alert.alert('Erreur', 'Problème de connexion aux données de votre stock.');
                }
                setLoading(false);
              }
            );
            
          return () => unsubscribe();
        } catch (error: any) {
          console.error('Error setting up stock listener:', error);
          Alert.alert('Erreur', 'Impossible d\'accéder à votre stock.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setLoading(false);
      }
    };
    
    checkAuthAndFetchStock();
  }, []);

  // Search for ingredients with error handling
  const searchIngredients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingIngredients(true);
    const result = await FirebaseService.searchIngredients(query, 10);
    
    if (result.success && result.data) {
      setSearchResults(result.data);
    } else {
      console.error('Error searching ingredients:', result.error);
      setSearchResults([]);
    }
    setSearchingIngredients(false);
  };

  // Handle selecting an ingredient from search results
  const selectIngredient = (ingredient: Ingredient) => {
    setNewItemName(ingredient.nom);
    setSelectedIngredient(ingredient);
    
    // Check if the ingredient has an image URL from Firebase
    if (ingredient.imageUrls && ingredient.imageUrls.length > 0) {
      // Use the first image URL from Firebase
      console.log("Setting remote image URL:", ingredient.imageUrls[0]);
      setSelectedIngredientImage(ingredient.imageUrls[0]);
    } else {
      // Try to find a matching local image from assets/images/ingrid
      console.log("No remote image found, using local image");
      try {
        // We'll set a local path that will be resolved when rendering
        const localImagePath = `../../assets/images/ingrid/6-10.jpg`;
        setSelectedIngredientImage(localImagePath);
      } catch (error) {
        console.error('Error loading local ingredient image:', error);
        setSelectedIngredientImage(null);
      }
    }
    
    setSearchQuery('');
    setSearchResults([]);
  };

  // Add new stock item
  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour l\'article.');
      return;
    }

    setAddingItem(true);
    
    try {
      // Check authentication first
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté. Veuillez vous reconnecter.');
        setAddingItem(false);
        return;
      }
      
      const userId = currentUser.uid;
      console.log('Adding stock item for user:', userId);
      
      // Try direct Firestore access
      try {
        // Create the new item object with all needed properties
        const newItem: any = {
          nom: newItemName.trim(),
          quantite: newItemQuantity.trim() || '1',
          unite: newItemUnit.trim() || 'unité',
          datePeremption: newItemExpiryDate || null,
          createdAt: firestore.FieldValue.serverTimestamp(),
        };
        
        // If we have a selected ingredient, add its reference and image URL
        if (selectedIngredient) {
          newItem.ingredientRef = selectedIngredient.id;
          
          // If we have a Firebase image URL, save it with the item
          if (typeof selectedIngredientImage === 'string' && selectedIngredientImage.startsWith('http')) {
            newItem.imageUrl = selectedIngredientImage;
          }
        }
        
        // Add the item to Firestore
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('stock')
          .add(newItem);

        // Clear form and selected ingredient state
        setNewItemName('');
        setNewItemQuantity('');
        setNewItemUnit('');
        setNewItemExpiryDate(null);
        setSelectedIngredient(null);
        setSelectedIngredientImage(null);
        setShowAddModal(false);
        
        console.log('Stock item added successfully');
      } catch (firestoreError: any) {
        console.error('Error adding stock item:', firestoreError);
        if (firestoreError?.code === 'permission-denied') {
          Alert.alert(
            'Erreur d\'accès', 
            'Vous n\'avez pas les permissions nécessaires pour ajouter des articles.'
          );
        } else {
          Alert.alert('Erreur', 'Problème lors de l\'ajout de l\'article.');
        }
      }
    } catch (error) {
      console.error('Add stock item error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ajout de l\'article.');
    } finally {
      setAddingItem(false);
    }
  };

  // Delete stock item with improved error handling
  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer cet article ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Check authentication first
              const currentUser = auth().currentUser;
              if (!currentUser) {
                Alert.alert('Erreur', 'Utilisateur non connecté. Veuillez vous reconnecter.');
                setLoading(false);
                return;
              }
              
              const userId = currentUser.uid;
              console.log(`Deleting stock item ${itemId} for user ${userId}`);
              
              // Try direct Firestore access
              try {
                await firestore()
                  .collection('users')
                  .doc(userId)
                  .collection('stock')
                  .doc(itemId)
                  .delete();
                  
                console.log('Stock item deleted successfully');
              } catch (firestoreError: any) {
                console.error('Error deleting stock item:', firestoreError);
                if (firestoreError?.code === 'permission-denied') {
                  Alert.alert(
                    'Erreur d\'accès', 
                    'Vous n\'avez pas les permissions nécessaires pour supprimer des articles.'
                  );
                } else {
                  Alert.alert('Erreur', 'Problème lors de la suppression de l\'article.');
                }
              }
            } catch (error) {
              console.error('Delete stock item error:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Date picker handlers
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewItemExpiryDate(selectedDate);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Non spécifiée';
    try {
      return timestamp.toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Non spécifiée';
    }
  };

  // Auto-advance slider
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sliderItems.length > 0) {
      interval = setInterval(() => {
        if (slideRef.current) {
          const nextIndex = (currentSlideIndex + 1) % sliderItems.length;
          slideRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          setCurrentSlideIndex(nextIndex);
        }
      }, 3000); // Change image every 3 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentSlideIndex, sliderItems]);

  // Render image slider with improved error handling
  const renderImageSlider = () => {
    if (loadingSlider) {
      return (
        <View style={styles.sliderContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      );
    }

    if (sliderItems.length === 0) {
      return (
        <View style={styles.sliderContainer}>
          <Text style={styles.emptyText}>Aucune image disponible</Text>
        </View>
      );
    }

    return (
      <View style={styles.sliderContainer}>
        <FlatList
          ref={slideRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="center"
          data={sliderItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.sliderItem}>
              <Image
                source={item.imageUrl}
                style={styles.sliderImage}
                resizeMode="cover"
                onError={(e) => {
                  console.log('Image loading error:', e.nativeEvent.error);
                }}
              />
            </View>
          )}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.floor(event.nativeEvent.contentOffset.x / width);
            setCurrentSlideIndex(slideIndex);
          }}
        />
        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          {sliderItems.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentSlideIndex ? styles.paginationDotActive : null
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  // Render add modal
  const renderAddModal = () => {
    // Function to open image picker for selecting local images
    const openImagePicker = () => {
      launchImageLibrary(
        { mediaType: 'photo', quality: 0.8, includeBase64: false },
        (response) => {
          if (response.didCancel) {
            console.log('User cancelled image picker');
          } else if (response.errorCode) {
            console.log('ImagePicker Error: ', response.errorMessage);
          } else if (response.assets && response.assets[0].uri) {
            setSelectedIngredientImage(response.assets[0].uri);
          }
        }
      );
    };
    
    return (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter un article</Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Search for ingredients */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un ingrédient..."
              value={searchQuery}
              onChangeText={(query) => {
                setSearchQuery(query);
                searchIngredients(query);
              }}
            />
            {searchingIngredients && (
              <ActivityIndicator size="small" color={COLORS.accent} style={styles.searchLoader} />
            )}
          </View>

          {/* Search results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResult}
                    onPress={() => selectIngredient(item)}
                  >
                    <Text style={styles.searchResultText}>{item.nom}</Text>
                    {item.categorie && (
                      <Text style={styles.searchResultCategory}>{item.categorie}</Text>
                    )}
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
              />
            </View>
          )}
          
          {/* Selected ingredient image */}
          {selectedIngredientImage && (
            <View style={styles.selectedImageContainer}>
              {typeof selectedIngredientImage === 'string' && selectedIngredientImage.startsWith('http') ? (
                <Image 
                  source={{ uri: selectedIngredientImage }} 
                  style={styles.selectedImage} 
                  resizeMode="cover" 
                />
              ) : (
                <Image 
                  source={require('../../assets/images/ingrid/6-10.jpg')} 
                  style={styles.selectedImage} 
                  resizeMode="cover" 
                />
              )}
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={openImagePicker}
              >
                <Text style={styles.changeImageText}>Changer l'image</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Add image button if no image selected */}
          {!selectedIngredientImage && (
            <TouchableOpacity 
              style={styles.addImageButton}
              onPress={openImagePicker}
            >
              <Icon name="image-outline" size={24} color={COLORS.accent} />
              <Text style={styles.addImageText}>Ajouter une image</Text>
            </TouchableOpacity>
          )}

          {/* Form inputs */}
          <TextInput
            style={styles.modalInput}
            placeholder="Nom de l'article"
            value={newItemName}
            onChangeText={setNewItemName}
          />

          <View style={styles.quantityRow}>
            <TextInput
              style={[styles.modalInput, styles.quantityInput]}
              placeholder="Quantité"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.modalInput, styles.unitInput]}
              placeholder="Unité"
              value={newItemUnit}
              onChangeText={setNewItemUnit}
            />
          </View>

          {/* Date picker */}
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.datePickerButtonText}>
              Péremption: {newItemExpiryDate ? newItemExpiryDate.toLocaleDateString('fr-FR') : 'Non spécifiée'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newItemExpiryDate || new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {/* Add button */}
          <TouchableOpacity
            style={[styles.addButton, addingItem && styles.addButtonDisabled]}
            onPress={handleAddItem}
            disabled={addingItem}
          >
            {addingItem ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="add-circle" size={20} color="white" />
                <Text style={styles.addButtonText}>Ajouter au stock</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  }

  // Set up navigation styling
  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: '#1a2d5a', // Navy blue color
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Chargement de votre stock...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a2d5a" barStyle="light-content" />
      
      {/* Image slider */}
      {renderImageSlider()}

      {/* Stock list */}
      <View style={styles.contentWrapper}>
        {stockItems.length === 0 ? (
          <View style={styles.emptyListContainer}>
            <Icon name="cube-outline" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyListText}>Votre stock est vide</Text>
            <Text style={styles.emptyListSubtext}>Appuyez sur + pour ajouter des articles</Text>
          </View>
        ) : (
          <FlatList
            data={stockItems}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.stockCard}>
                {/* Check for image URL first, then ingredient reference */}
                {item.imageUrl ? (
                  <Image 
                    source={{ uri: item.imageUrl }}
                    style={styles.stockItemImage}
                    resizeMode="cover"
                  />
                ) : item.ingredientRef ? (
                  <Image 
                    source={getIngredientImage(item.ingredientRef)}
                    style={styles.stockItemImage}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.stockInfo}>
                  <Text style={[styles.stockName, {color: COLORS.accent}]}>{item.nom}</Text>
                  <Text style={styles.stockQuantity}>{item.quantite} {item.unite}</Text>
                  <Text style={styles.stockExpiry}>Péremption: {formatDate(item.datePeremption)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteItem(item.id)}
                >
                  <Icon name="trash-outline" size={20} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingActionButton}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Add Modal */}
      {renderAddModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary, // Change to navy blue
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: COLORS.primary, // Navy blue color
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40, // For layout balance
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  sliderContainer: {
    height: 350, // Increased height to match HomeScreen
    width: '100%',
    backgroundColor: COLORS.primary, // Navy blue background
    paddingVertical: 20, // Add padding for nicer look
  },
  sliderContentContainer: {
    paddingVertical: 10,
  },
  sliderItem: {
    width: width, // Full width like HomeScreen
    height: 350, // Matching container height
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0, // Remove border radius for full-screen look
    opacity: 0.9,
  },
  sliderTitleContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sliderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
    backgroundColor: COLORS.card,
    marginVertical: 10,
  },
  // Stock list styles
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyListText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 15,
  },
  emptyListSubtext: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 5,
  },
  listContent: {
    padding: 16,
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 45, 90, 0.8)', // Dark blue with opacity
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  stockItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent, // Orange text for item names
    marginTop: 2,
  },
  stockQuantity: {
    fontSize: 16,
    color: '#ffffff', // White text for better contrast on dark background
    marginTop: 2,
  },
  stockExpiry: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white for secondary text
    marginTop: 2,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: COLORS.accent + '15',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating Action Button
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.accent,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 5,
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  searchLoader: {
    marginLeft: 10,
  },
  searchResultsContainer: {
    maxHeight: 150,
    marginBottom: 15,
  },
  searchResultsList: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    maxHeight: 150,
  },
  searchResult: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  searchResultCategory: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // Form styles
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: COLORS.card,
    color: COLORS.text,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    marginRight: 10,
  },
  unitInput: {
    flex: 0.6,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    marginBottom: 20,
  },
  datePickerButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.accent + '80',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Ingredient image styles
  selectedImageContainer: {
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    alignItems: 'center',
  },
  changeImageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  addImageText: {
    color: COLORS.accent,
    fontSize: 16,
    marginLeft: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: COLORS.accent,
  },
  contentWrapper: {
    flex: 1,
  },
});

export default StockScreen;
