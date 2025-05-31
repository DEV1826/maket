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
} from 'react-native';
// Importez les fonctions modulaires de Firestore
import firestore from '@react-native-firebase/firestore'; // Main Firebase Firestore module
import auth from '@react-native-firebase/auth'; // Main Firebase Auth module

// Importez les types spécifiques de Firestore via le module principal
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker'; // Installez ceci

interface StockItem {
  id: string;
  nom: string;
  quantite: string;
  unite: string;
  datePeremption?: FirebaseFirestoreTypes.Timestamp; // Utiliser le type Timestamp de @react-native-firebase/firestore
  createdAt?: FirebaseFirestoreTypes.FieldValue; // Utiliser FieldValue pour serverTimestamp
}

const StockScreen: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemExpiryDate, setNewItemExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);

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
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement de votre stock...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Mon Stock</Text>
      </View>

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
          <Icon name="calendar-outline" size={20} color="#333" />
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
              <Icon name="add-circle-outline" size={20} color="white" />
              <Text style={styles.addButtonText}>Ajouter au stock</Text>
            </>
          )}
        </TouchableOpacity>
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
                <Icon name="trash-outline" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    minHeight: 300,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    marginBottom: 5,
    backgroundColor: '#fff',
    color: '#000',
    height: 35,
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
    color: '#444',
    marginTop: 8,
    marginLeft: 12,
    fontWeight: '500',
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
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  datePickerButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: '#aaddaa',
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
  },
  emptyListText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stockQuantity: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  stockExpiry: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 5,
  },
});

export default StockScreen;