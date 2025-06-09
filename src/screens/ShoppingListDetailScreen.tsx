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
  Share,
  Clipboard,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation'; 

type ShoppingListDetailScreenRouteProp = RouteProp<RootStackParamList, 'ShoppingListDetail'>;

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  isCompleted: boolean;
  addedBy: string;
  //  l'écriture, mais sera Timestamp après lecture
  createdAt: FirebaseFirestoreTypes.FieldValue | FirebaseFirestoreTypes.Timestamp;
}

interface ShoppingListHeader {
  id: string;
  name: string;
  ownerId: string;
  sharedWith: string[];
  // createdAt et lastModified peuvent être FieldValue au moment de l'écriture, mais seront Timestamp après lecture
  createdAt: FirebaseFirestoreTypes.FieldValue | FirebaseFirestoreTypes.Timestamp;
  lastModified: FirebaseFirestoreTypes.FieldValue | FirebaseFirestoreTypes.Timestamp;
}

const ShoppingListDetailScreen: React.FC = () => {
  const route = useRoute<ShoppingListDetailScreenRouteProp>();
  const { listId } = route.params; // L'ID de la liste est obligatoire ici

  const [listName, setListName] = useState('');
  const [listOwnerId, setListOwnerId] = useState('');
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const userId = auth().currentUser?.uid;

  useEffect(() => {
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    // Listener pour les informations de la liste (nom, partages)
    const listHeaderSubscriber = firestore()
      .collection('shoppingLists')
      .doc(listId)
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as ShoppingListHeader;
            if (data && data.name && data.ownerId) {
              setListName(data.name);
              setListOwnerId(data.ownerId);
              setSharedUsers(data.sharedWith || []);
            } else {
              console.warn('Incomplete data received from Firestore');
            }
          } else {
            Alert.alert('Erreur', 'Cette liste de courses n\'existe plus.');
            // navigation.goBack(); // Optionnel: revenir en arrière si la liste est supprimée
          }
        },
        error => {
          console.error("Erreur d'abonnement aux détails de la liste:", error);
          Alert.alert('Erreur', 'Impossible de charger les détails de la liste.');
        }
      );

    // Listener pour les articles de la liste
    const itemsSubscriber = firestore()
      .collection('shoppingLists')
      .doc(listId)
      .collection('items')
      .orderBy('createdAt', 'asc') // Trier par date d'ajout
      .onSnapshot(
        querySnapshot => {
          const loadedItems: ShoppingListItem[] = [];
          querySnapshot.forEach(documentSnapshot => {
            loadedItems.push({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            } as ShoppingListItem);
          });
          setItems(loadedItems);
          setLoading(false);
        },
        error => {
          console.error("Erreur d'abonnement aux articles de la liste:", error);
          Alert.alert('Erreur', 'Problème de connexion aux articles de la liste.');
          setLoading(false);
        }
      );

    return () => {
      listHeaderSubscriber();
      itemsSubscriber();
    };
  }, [listId, userId]);

  const handleAddItem = async () => {
    if (!userId) return;
    if (!newItemName.trim() || !newItemQuantity.trim() || !newItemUnit.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom, la quantité et l\'unité.');
      return;
    }

    setAddingItem(true);
    try {
      await firestore()
        .collection('shoppingLists')
        .doc(listId)
        .collection('items')
        .add({
          name: newItemName.trim(),
          quantity: newItemQuantity.trim(),
          unit: newItemUnit.trim(),
          isCompleted: false,
          addedBy: userId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      // Mettre à jour lastModified de la liste parente
      await firestore().collection('shoppingLists').doc(listId).update({
        lastModified: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'article à la liste:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'article.');
    } finally {
      setAddingItem(false);
    }
  };

  const toggleItemCompleted = async (itemId: string, currentStatus: boolean) => {
    if (!userId) return;
    try {
      await firestore()
        .collection('shoppingLists')
        .doc(listId)
        .collection('items')
        .doc(itemId)
        .update({
          isCompleted: !currentStatus,
        });
      await firestore().collection('shoppingLists').doc(listId).update({
        lastModified: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'article:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'article.');
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!userId) return;
    Alert.alert(
      'Supprimer article',
      `Voulez-vous supprimer "${itemName}" de la liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              await firestore()
                .collection('shoppingLists')
                .doc(listId)
                .collection('items')
                .doc(itemId)
                .delete();
              await firestore().collection('shoppingLists').doc(listId).update({
                lastModified: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Succès', `"${itemName}" supprimé.`);
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'article.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleShareList = async () => {
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    try {
      const shareMessage = `Rejoignez ma liste de courses "${listName}" dans l'application ! Utilisez cet ID: \n\n${listId}\n\n`;
      await Share.share({
        message: shareMessage,
        title: `Rejoindre la liste: ${listName}`,
      });
    } catch (error: any) {
      Alert.alert('Erreur de partage', error.message);
    }
  };

  const handleCopyListId = () => {
    Clipboard.setString(listId);
    Alert.alert('ID Copié', 'L\'ID de la liste a été copié dans le presse-papiers !');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement de la liste de courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{listName}</Text>
      <View style={styles.shareContainer}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareList}>
          <Icon name="share-social-outline" size={20} color="white" />
          <Text style={styles.shareButtonText}>Partager la liste</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyListId}>
          <Icon name="copy-outline" size={20} color="white" />
          <Text style={styles.shareButtonText}>Copier l'ID</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nom de l'article"
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <View style={styles.quantityRow}>
          <TextInput
            style={[styles.input, styles.quantityInput]}
            placeholder="Qté"
            value={newItemQuantity}
            onChangeText={setNewItemQuantity}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.unitInput]}
            placeholder="Unité (ex: kg, L)"
            value={newItemUnit}
            onChangeText={setNewItemUnit}
          />
        </View>
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
              <Text style={styles.addButtonText}>Ajouter à la liste</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Icon name="cart-outline" size={60} color="#ccc" />
          <Text style={styles.emptyListText}>Cette liste est vide.</Text>
          <Text style={styles.emptyListText}>Ajoutez-y des articles ci-dessus !</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <TouchableOpacity
                onPress={() => toggleItemCompleted(item.id, item.isCompleted)}
                style={styles.checkboxContainer}
              >
                <Icon
                  name={item.isCompleted ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color={item.isCompleted ? 'green' : '#888'}
                />
              </TouchableOpacity>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, item.isCompleted && styles.itemCompleted]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemQuantity, item.isCompleted && styles.itemCompleted]}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.id, item.name)}
                style={styles.deleteButton}
              >
                <Icon name="trash-outline" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
    padding: 20,
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
    marginBottom: 15,
    textAlign: 'center',
  },
  shareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 5,
  },
  copyButton: {
    backgroundColor: '#FFC107', // Couleur différente pour copier
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 5,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  inputContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quantityInput: {
    flex: 0.35,
    marginRight: 10,
  },
  unitInput: {
    flex: 0.65,
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
  itemCard: {
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
  checkboxContainer: {
    marginRight: 10,
    padding: 5,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  itemCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteButton: {
    marginLeft: 15,
    padding: 5,
  },
});

export default ShoppingListDetailScreen;