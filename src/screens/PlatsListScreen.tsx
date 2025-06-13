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
  TouchableWithoutFeedback
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
        .map(dish => dish.trim())
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
                      <View style={styles.dishItem}>
                        <Icon name="restaurant-outline" size={24} color="#ff8c00" />
                        <Text style={styles.dishName}>{item}</Text>
                      </View>
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
  },
  noDishesText: {
    padding: 16,
    fontSize: 16,
    color: '#8b9dc3',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
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