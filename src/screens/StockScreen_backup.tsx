import React, { useState, useEffect } from 'react';
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
  Dimensions,
  Modal,
} from 'react-native';
// Importez les fonctions modulaires de Firestore
import firestore from '@react-native-firebase/firestore'; // Main Firebase Firestore module
import auth from '@react-native-firebase/auth'; // Main Firebase Auth module
import storage from '@react-native-firebase/storage'; // Firebase Storage module

// Importez les types spécifiques de Firestore via le module principal
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

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

interface StockItem {
  id: string;
  nom: string;
  quantite: string;
  unite: string;
  datePeremption?: FirebaseFirestoreTypes.Timestamp; // Utiliser le type Timestamp de @react-native-firebase/firestore
  createdAt?: FirebaseFirestoreTypes.FieldValue; // Utiliser FieldValue pour serverTimestamp
}

interface SliderItem {
  id: string;
  nom: string;
  imageUrl: string;
}

interface Ingredient {
  id: string;
  nom: string;
  imageUrls: string[];
  categorie?: string;
}

const StockScreen: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [sliderItems, setSliderItems] = useState<SliderItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemExpiryDate, setNewItemExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSlider, setLoadingSlider] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchingIngredients, setSearchingIngredients] = useState(false);

  // Fetch random items for the slider from public_plats collection
  useEffect(() => {
    setLoadingSlider(true);
    
    // Get random public dishes for the slider
    firestore()
      .collection('public_plats')
      .limit(10) // Limit to 10 random items
      .get()
      .then(querySnapshot => {
        const items: SliderItem[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.imageUrl) { // Only add items with images
            items.push({
              id: doc.id,
              nom: data.nom || 'Plat',
              imageUrl: data.imageUrl
            });
          }
        });
        setSliderItems(items);
        setLoadingSlider(false);
      })
      .catch(error => {
        console.error('Error fetching slider items:', error);
        setLoadingSlider(false);
      });
  }, []);

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    // Référence à la collection 'stock' de l'utilisateur
    const userStockRef = firestore()
      .collection('users')
      .doc(userId)
      .collection('stock');

    const subscriber = userStockRef
      .orderBy('nom', 'asc') // Tri par nom
      .onSnapshot(
        // C'est ici que la surcharge de onSnapshot était un problème.
        // La structure (onNext, onError, onCompletion) est correcte.
        // Le problème était avec les types importés de 'firebase/firestore' qui étaient incompatibles
        // avec '@react-native-firebase/firestore'.
        (querySnapshot) => { // Type inféré ou utilisez FirebaseFirestoreTypes.QuerySnapshot
          const loadedItems: StockItem[] = [];
          querySnapshot.forEach((documentSnapshot) => { // Type inféré ou utilisez FirebaseFirestoreTypes.DocumentSnapshot
            loadedItems.push({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            } as StockItem);
          });
          setStockItems(loadedItems);
          setLoading(false);
        },
        (error) => { // Type inféré ou utilisez Error
          console.error("Erreur d'abonnement au stock:", error);
          Alert.alert(
            'Erreur',
            'Problème de connexion aux données de votre stock.'
          );
          setLoading(false);
        }
      );

    return () => subscriber();
  }, []);

  // Search for ingredients in Firebase
  const searchIngredients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingIngredients(true);
    try {
      const querySnapshot = await firestore()
        .collection('ingredients')
        .where('nom', '>=', query.toLowerCase())
        .where('nom', '<=', query.toLowerCase() + '\uf8ff')
        .limit(10)
        .get();

      const results: Ingredient[] = [];
      querySnapshot.forEach(doc => {
        results.push({
          id: doc.id,
          ...doc.data()
        } as Ingredient);
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching ingredients:', error);
    } finally {
      setSearchingIngredients(false);
    }
  };

  // Handle selecting an ingredient from search results
  const selectIngredient = (ingredient: Ingredient) => {
    setNewItemName(ingredient.nom);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddItem = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    if (!newItemName.trim() || !newItemQuantity.trim() || !newItemUnit.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom, la quantité et l\'unité.');
      return;
    }

    setAddingItem(true);
    try {
      await firestore() // Utilisez firestore() comme avant, car il est le point d'entrée pour @react-native-firebase/firestore
        .collection('users')
        .doc(userId)
        .collection('stock')
        .add({
          nom: newItemName.trim(),
          quantite: newItemQuantity.trim(),
          unite: newItemUnit.trim(),
          // Utilisez firestore.Timestamp et firestore.FieldValue de @react-native-firebase/firestore
          datePeremption: newItemExpiryDate ? firestore.Timestamp.fromDate(newItemExpiryDate) : null,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      setNewItemExpiryDate(null);
      Alert.alert('Succès', 'Article ajouté au stock !');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'article au stock:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'article. Veuillez réessayer.');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    Alert.alert(
      'Supprimer un article',
      `Voulez-vous vraiment supprimer ${itemName} de votre stock ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            const userId = auth().currentUser?.uid;
            if (!userId) {
              Alert.alert('Erreur', 'Utilisateur non connecté.');
              return;
            }
            try {
              await firestore() // Utilisez firestore()
                .collection('users')
                .doc(userId)
                .collection('stock')
                .doc(itemId)
                .delete();
              Alert.alert('Succès', `${itemName} a été supprimé du stock.`);
            } catch (error) {
              console.error('Erreur lors de la suppression de l\'article:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'article.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || newItemExpiryDate;
    setShowDatePicker(Platform.OS === 'ios');
    setNewItemExpiryDate(currentDate);
  };

  const formatDate = (timestamp: FirebaseFirestoreTypes.Timestamp | undefined): string => {
    if (!timestamp) return 'Non spécifiée';
    try {
      const date = timestamp.toDate();
      if (isNaN(date.getTime())) {
        console.error('Invalid date timestamp');
        return 'Invalide';
      }
      return date.toLocaleDateString('fr-FR');
    } catch (e) {
      console.error("Erreur lors de la conversion de la date:", e);
      return 'Invalide';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.accent} />
        ) : (
          <Text>Chargement de votre stock...</Text>
        )}
      </View>
    );
  }

  // Image slider component
  const renderImageSlider = () => {
    if (loadingSlider) {
      return (
        <View style={styles.sliderLoadingContainer}>
          <ActivityIndicator size="small" color={COLORS.accent} />
        </View>
      );
    }

    if (sliderItems.length === 0) {
      return null;
    }

    return (
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderTitle}>Découvrez des ingrédients</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={sliderItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.sliderItem}>
              {item.imageUrl ? (
                <View style={styles.sliderImageContainer}>
                  <Image 
                    source={{ uri: item.imageUrl }} 
                    style={styles.sliderImage} 
                    resizeMode="cover"
                  />
                  <View style={styles.sliderImageOverlay}>
                    <Text style={styles.sliderImageText}>{item.nom}</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.sliderImageContainer, styles.sliderNoImage]}>
                  <Icon name="image-outline" size={30} color={COLORS.primary} />
                </View>
              )}
            </View>
          )}
          contentContainerStyle={styles.sliderContent}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Mon Stock</Text>
      </View>
      
      {renderImageSlider()}

      <View style={styles.inputContainer}>
        <View style={styles.inputWithHelp}>
          <TextInput
            style={styles.input}
            placeholder="Nom de l'article"
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <Text style={styles.helpText}>Exemple: Tomates, Lait, Pommes</Text>
        </View>
        <View style={styles.quantityRow}>
          <View style={styles.inputWithHelp}>
            <TextInput
              style={[styles.input, styles.quantityInput]}
              placeholder="Quantité"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="numeric"
            />
            <Text style={[styles.helpText, styles.quantityHelp]}>Exemple: 5, 1.5, 200</Text>
          </View>
          <View style={styles.inputWithHelp}>
            <TextInput
              style={[styles.input, styles.unitInput]}
              placeholder="Unité"
              value={newItemUnit}
              onChangeText={setNewItemUnit}
            />
            <Text style={[styles.helpText, styles.quantityHelp]}>Exemple: kg, L, g</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="calendar-outline" size={20} color={COLORS.primary} />
          <Text style={styles.datePickerButtonText}>
            Date de péremption : {newItemExpiryDate ? newItemExpiryDate.toLocaleDateString('fr-FR') : 'Non spécifiée'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={newItemExpiryDate || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()} // Empêche de choisir des dates passées
          />
        )}

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

        <TextInput
          style={styles.input}
          placeholder="Rechercher un ingrédient"
          value={searchQuery}
          onChangeText={(query) => {
            setSearchQuery(query);
            searchIngredients(query);
          }}
        />
        {searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResult}
                onPress={() => selectIngredient(item)}
              >
                <Text style={styles.searchResultText}>{item.nom}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {stockItems.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Icon name="cube-outline" size={60} color="#ccc" />
          <Text style={styles.emptyListText}>Votre stock est vide.</Text>
          <Text style={styles.emptyListText}>Ajoutez-y des articles ci-dessus !</Text>
        </View>
      ) : (
        <FlatList
          data={stockItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.stockCard}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockName}>{item.nom}</Text>
                <Text style={styles.stockQuantity}>{item.quantite} {item.unite}</Text>
                <Text style={styles.stockExpiry}>Péremption: {formatDate(item.datePeremption)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.id, item.nom)}
                style={styles.deleteButton}
              >
                <Icon name="trash-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
      <TouchableOpacity
        style={styles.floatingActionButton}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add-circle" size={30} color="white" />
      </TouchableOpacity>
      <Modal
        visible={showAddModal}
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un article</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom de l'article"
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Quantité"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Unité"
              value={newItemUnit}
              onChangeText={setNewItemUnit}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleAddItem}
            >
              <Text style={styles.modalButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerContainer: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 300,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    height: 45,
    textAlignVertical: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  quantityInput: {
    flex: 1,
    marginRight: 10,
  },
  inputWithHelp: {
    marginBottom: 15,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 5,
    marginLeft: 5,
    fontWeight: '400',
  },
  quantityHelp: {
    marginLeft: 5,
  },
  unitInput: {
    flex: 0.65,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    marginBottom: 15,
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
    marginTop: 15,
    elevation: 2,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.accent + '80', // 50% opacity
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyListText: {
    fontSize: 18,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 15,
  },
  listContent: {
    padding: 15,
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  stockQuantity: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 5,
  },
  stockExpiry: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 5,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: COLORS.danger + '10',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Slider styles
  sliderContainer: {
    marginVertical: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
  },
  sliderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 15,
    marginBottom: 10,
  },
  sliderContent: {
    paddingHorizontal: 10,
  },
  sliderItem: {
    marginHorizontal: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sliderImageContainer: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  sliderImage: {
    width: '100%',
    height: '100%',
  },
  sliderImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
  },
  sliderImageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderNoImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  sliderLoadingContainer: {
    height: width * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResult: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultText: {
    fontSize: 16,
    color: COLORS.text,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 30,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    height: 45,
    textAlignVertical: 'center',
  },
  modalButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    elevation: 2,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default StockScreen;