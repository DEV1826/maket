import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Image,
  Dimensions,
  ImageBackground,
  StatusBar,
  SafeAreaView,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Importez les types de navigation depuis votre fichier global
import { RootStackParamList } from '../types/navigation';

type PlatsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlatsList'>;

// Interface pour un plat (peut être exportée et réutilisée)
interface Plat {
  id: string;
  nom: string;
  description: string;
  imageUrl?: string;
  imageUri?: string; // Added for local image URI support
  createdAt?: any; // Ajouté pour le tri
  // Ajoutez d'autres propriétés de plat ici si nécessaire pour l'affichage initial
  ingredients?: Array<{ quantite: string; unite: string; nom: string }>;
  etapes?: string[];
  tempsPreparation?: number;
  tempsCuisson?: number;
  portions?: number;
  categorie?: string;
  userId?: string;
}

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI('AIzaSyCQmAnJ4QLHbqna7LiJsgY32xjW-JzXfaE');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const PlatsListScreen: React.FC = () => {
  const navigation = useNavigation<PlatsListScreenNavigationProp>();
  const [plats, setPlats] = useState<Plat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [locationDishes, setLocationDishes] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDish, setSelectedDish] = useState<string>('');
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Plat | null>(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const fetchPlats = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('plats')
        .orderBy('createdAt', 'desc')
        .get();

      const loadedPlats: Plat[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Plat[];

      setPlats(loadedPlats);
    } catch (error) {
      console.error("Erreur lors du chargement des plats:", error);
      Alert.alert('Erreur', 'Impossible de charger vos plats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('plats')
      .orderBy('createdAt', 'desc')
      .onSnapshot(querySnapshot => {
        const loadedPlats: Plat[] = [];
        querySnapshot.forEach(documentSnapshot => {
          loadedPlats.push({
            id: documentSnapshot.id,
            ...documentSnapshot.data(),
          } as Plat);
        });
        setPlats(loadedPlats);
        setLoading(false);
      }, error => {
        console.error("Erreur d'abonnement aux plats:", error);
        Alert.alert('Erreur', 'Problème de connexion aux données des plats.');
        setLoading(false);
      });

    return () => subscriber();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlats();
  };

  // Get screen width to calculate card width for 2-column layout
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2; // 48 = padding (16) * 3 (left, middle, right)
  
  const renderPlatItem = ({ item }: { item: Plat }) => (
    <TouchableOpacity
      style={[styles.platCard, { width: cardWidth }]}
      onPress={() => navigation.navigate({ name: 'PlatDetail', params: { platId: item.id } })}
    >
      {/* Image section */}
      {item.imageUri || item.imageUrl ? (
        <Image 
          source={{ uri: item.imageUri || item.imageUrl }} 
          style={styles.platImage} 
        />
      ) : (
        <View style={styles.platImagePlaceholder}>
          <Icon name="restaurant-outline" size={40} color="#fff" />
        </View>
      )}
      
      {/* Content section */}
      <View style={styles.platInfo}>
        <Text style={styles.platName} numberOfLines={1}>{item.nom}</Text>
        <Text style={styles.platDescription} numberOfLines={2}>{item.description}</Text>
        
        {/* Time info */}
        {(item.tempsPreparation || item.tempsCuisson) && (
          <View style={styles.timeInfo}>
            <Icon name="time-outline" size={14} color="#fff" />
            <Text style={styles.timeText}>
              {item.tempsPreparation ? `${item.tempsPreparation} min` : ''}
              {item.tempsPreparation && item.tempsCuisson ? ' + ' : ''}
              {item.tempsCuisson ? `${item.tempsCuisson} min` : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#1a2f5a" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Chargement de vos plats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Function to search for traditional dishes by location using Gemini API
  const searchDishesForLocation = async () => {
    if (!searchLocation.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un lieu pour la recherche');
      return;
    }
    
    setSearchLoading(true);
    try {
      const prompt = `Provide a list of 5 traditional meals commonly eaten by people in ${searchLocation}. Format as a simple list with no numbering, no explanations, and no additional text. Just the dish names.`;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Parse the response into an array of dishes
      const dishes = text.split('\n')
        .map(dish => dish.trim().replace(/^\*\s*|\*$/g, '')) // Remove asterisks from beginning or end
        .filter(dish => dish !== '');
      
      setLocationDishes(dishes.slice(0, 5)); // Limit to 5 dishes
      setModalVisible(true);
    } catch (error) {
      console.error('Error searching dishes:', error);
      Alert.alert('Erreur', 'Impossible de trouver des plats pour cet endroit. Veuillez réessayer.');
    } finally {
      setSearchLoading(false);
    }
  };
  
  // Function to generate a recipe for a selected dish
  const generateRecipe = async (dishName: string) => {
    setSelectedDish(dishName);
    setGeneratingRecipe(true);
    setRecipeModalVisible(true);
    
    try {
      const prompt = `Generate a detailed recipe for ${dishName}, a traditional dish from ${searchLocation}. Format the response as a JSON object with the following structure exactly:
      {
        "nom": "${dishName}",
        "description": "Brief description of the dish",
        "ingredients": [
          {"quantite": "amount", "unite": "unit", "nom": "ingredient name"},
          ...
        ],
        "etapes": ["Step 1 description", "Step 2 description", ...],
        "tempsPreparation": preparation time in minutes (number),
        "tempsCuisson": cooking time in minutes (number),
        "portions": number of servings (number),
        "categorie": "appropriate category"
      }
      Ensure all values are in French and the JSON is properly formatted.`;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      try {
        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        const recipeData = JSON.parse(jsonString);
        
        // Ensure the recipe has all required fields
        const recipe: Plat = {
          id: '', // Will be assigned when saved to Firestore
          nom: recipeData.nom || dishName,
          description: recipeData.description || '',
          ingredients: recipeData.ingredients || [],
          etapes: recipeData.etapes || [],
          tempsPreparation: recipeData.tempsPreparation || 0,
          tempsCuisson: recipeData.tempsCuisson || 0,
          portions: recipeData.portions || 2,
          categorie: recipeData.categorie || '',
        };
        
        setGeneratedRecipe(recipe);
      } catch (parseError) {
        console.error('Error parsing recipe JSON:', parseError);
        Alert.alert('Erreur', 'Impossible de générer la recette. Format incorrect.');
        setRecipeModalVisible(false);
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert('Erreur', 'Impossible de générer la recette. Veuillez réessayer.');
      setRecipeModalVisible(false);
    } finally {
      setGeneratingRecipe(false);
    }
  };
  
  // Function to save the generated recipe to Firestore
  const saveRecipe = async () => {
    if (!generatedRecipe) return;
    
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Vous devez être connecté pour enregistrer un plat.');
      return;
    }
    
    setSavingRecipe(true);
    try {
      const platData = {
        ...generatedRecipe,
        createdAt: firestore.FieldValue.serverTimestamp(),
        userId: userId
      };
      
      // Remove the id field as Firestore will generate one
      const { id, ...dataWithoutId } = platData;
      
      await firestore().collection('users').doc(userId).collection('plats').add(dataWithoutId);
      Alert.alert('Succès', 'Plat ajouté avec succès !');
      setRecipeModalVisible(false);
      fetchPlats(); // Refresh the list of plates
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le plat. Veuillez réessayer.');
    } finally {
      setSavingRecipe(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a2f5a" barStyle="light-content" />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des plats par lieu..."
          placeholderTextColor="#8b9dc3"
          value={searchLocation}
          onChangeText={setSearchLocation}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={searchDishesForLocation}
          disabled={searchLoading}
        >
          {searchLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Icon name="search" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Modal for displaying search results */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Plats traditionnels de {searchLocation}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Icon name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                {locationDishes.length > 0 ? (
                  <FlatList
                    data={locationDishes}
                    keyExtractor={(item, index) => `dish-${index}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={styles.dishItem}
                        onPress={() => generateRecipe(item)}
                      >
                        <Icon name="restaurant-outline" size={24} color="#ff8c00" />
                        <Text style={styles.dishName}>{item}</Text>
                        <Icon name="chevron-forward" size={20} color="#8b9dc3" style={styles.dishArrow} />
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <Text style={styles.noDishesText}>Aucun plat trouvé pour cet endroit.</Text>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Modal for displaying recipe details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={recipeModalVisible}
        onRequestClose={() => !generatingRecipe && setRecipeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recipeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDish}</Text>
              <TouchableOpacity 
                onPress={() => !generatingRecipe && setRecipeModalVisible(false)}
                disabled={generatingRecipe}
              >
                <Icon name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.recipeScrollView}>
              {generatingRecipe ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#ff8c00" />
                  <Text style={styles.secondaryLoadingText}>Génération de la recette...</Text>
                </View>
              ) : generatedRecipe ? (
                <View style={styles.recipeContainer}>
                  <Text style={styles.recipeDescription}>{generatedRecipe.description}</Text>
                  
                  <Text style={styles.recipeSectionTitle}>Informations</Text>
                  <View style={styles.recipeInfoContainer}>
                    <View style={styles.recipeInfoItem}>
                      <Icon name="time-outline" size={20} color="#ff8c00" />
                      <Text style={styles.recipeInfoText}>Préparation: {generatedRecipe.tempsPreparation} min</Text>
                    </View>
                    <View style={styles.recipeInfoItem}>
                      <Icon name="flame-outline" size={20} color="#ff8c00" />
                      <Text style={styles.recipeInfoText}>Cuisson: {generatedRecipe.tempsCuisson} min</Text>
                    </View>
                    <View style={styles.recipeInfoItem}>
                      <Icon name="people-outline" size={20} color="#ff8c00" />
                      <Text style={styles.recipeInfoText}>Portions: {generatedRecipe.portions}</Text>
                    </View>
                    {generatedRecipe.categorie && (
                      <View style={styles.recipeInfoItem}>
                        <Icon name="list-outline" size={20} color="#ff8c00" />
                        <Text style={styles.recipeInfoText}>Catégorie: {generatedRecipe.categorie}</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.recipeSectionTitle}>Ingrédients</Text>
                  {generatedRecipe.ingredients && generatedRecipe.ingredients.map((ingredient, index) => (
                    <View key={`ingredient-${index}`} style={styles.ingredientItem}>
                      <Icon name="ellipse" size={8} color="#ff8c00" style={styles.bulletPoint} />
                      <Text style={styles.ingredientText}>
                        {ingredient.quantite} {ingredient.unite} {ingredient.nom}
                      </Text>
                    </View>
                  ))}
                  
                  <Text style={styles.recipeSectionTitle}>Étapes</Text>
                  {generatedRecipe.etapes && generatedRecipe.etapes.map((etape, index) => (
                    <View key={`etape-${index}`} style={styles.etapeItem}>
                      <Text style={styles.etapeNumber}>{index + 1}</Text>
                      <Text style={styles.etapeText}>{etape}</Text>
                    </View>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={saveRecipe}
                    disabled={savingRecipe}
                  >
                    {savingRecipe ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Icon name="add-circle-outline" size={20} color="#ffffff" />
                        <Text style={styles.saveButtonText}>Ajouter à mes plats</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.noDishesText}>Erreur lors de la génération de la recette.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {plats.length === 0 ? (
        <ImageBackground 
          source={require('../../assets/images/intrance.png')} 
          style={styles.emptyListContainer}
          imageStyle={styles.backgroundImage}
        >
          <View style={styles.emptyOverlay}>
            <Icon name="restaurant-outline" size={80} color="#ffffff" />
            <Text style={styles.emptyListTitle}>Aucun plat enregistré</Text>
            <Text style={styles.emptyListText}>Ajoutez votre premier plat en cliquant sur le bouton +</Text>
          </View>
        </ImageBackground>
      ) : (
        <FlatList
          data={plats}
          renderItem={renderPlatItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.flatListContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('AddPlat', { platId: undefined })}
      >
        <Icon name="add" size={30} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2f5a', // Navy blue theme
  },
  header: {
    backgroundColor: '#1a2f5a',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c4372',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a2f5a',
    borderBottomWidth: 1,
    borderBottomColor: '#2c4372',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#2c4372',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  searchButton: {
    width: 40,
    height: 40,
    backgroundColor: '#ff8c00',
    borderRadius: 20,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#1a2f5a',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c4372',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  dishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c4372',
  },
  dishName: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
  },
  dishArrow: {
    marginLeft: 8,
  },
  noDishesText: {
    padding: 16,
    fontSize: 16,
    color: '#8b9dc3',
    textAlign: 'center',
  },
  recipeModalContent: {
    width: '90%',
    backgroundColor: '#1a2f5a',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  recipeScrollView: {
    maxHeight: '80%',
  },
  recipeContainer: {
    padding: 16,
  },
  recipeDescription: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    lineHeight: 22,
  },
  recipeSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff8c00',
    marginTop: 16,
    marginBottom: 8,
  },
  recipeInfoContainer: {
    backgroundColor: '#2c4372',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recipeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeInfoText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bulletPoint: {
    marginRight: 8,
  },
  ingredientText: {
    color: '#ffffff',
    fontSize: 14,
  },
  etapeItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  etapeNumber: {
    backgroundColor: '#ff8c00',
    color: '#ffffff',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontWeight: 'bold',
  },
  etapeText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#ff8c00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    marginTop: 24,
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff8c00', // Changed to orange
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 999,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    opacity: 0.5,
  },
  emptyOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(26, 47, 90, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: '#e0e0e0',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  flatListContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  platCard: {
    backgroundColor: '#2c4372',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  platImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  platImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#3a5795',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platInfo: {
    padding: 12,
  },
  platName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00', // Changed to orange
    marginBottom: 4,
  },
  platDescription: {
    fontSize: 12,
    color: '#e0e0e0',
    marginBottom: 8,
    lineHeight: 16,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#b0c4de',
    marginLeft: 4,
  },
});

export default PlatsListScreen;