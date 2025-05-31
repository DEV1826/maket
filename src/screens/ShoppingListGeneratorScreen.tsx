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
  Modal,
  Platform,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type ShoppingListsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ShoppingLists'>;

interface ShoppingList {
  id: string;
  name: string;
  ownerId: string;
  sharedWith: string[];
  createdAt: FirebaseFirestoreTypes.FieldValue;
  lastModified: FirebaseFirestoreTypes.FieldValue;
}

const ShoppingListsScreen: React.FC = () => {
  const navigation = useNavigation<ShoppingListsScreenNavigationProp>();
  const [myLists, setMyLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listToJoinId, setListToJoinId] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [joiningList, setJoiningList] = useState(false);

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    // Listener pour les listes possédées par l'utilisateur
    const ownedListsSubscriber = firestore()
      .collection('shoppingLists')
      .where('ownerId', '==', userId)
      .orderBy('lastModified', 'desc')
      .onSnapshot(
        querySnapshot => {
          const loadedLists: ShoppingList[] = [];
          querySnapshot.forEach(documentSnapshot => {
            loadedLists.push({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            } as ShoppingList);
          });
          setMyLists(prevLists => {
            const shared = prevLists.filter(list => list.sharedWith.includes(userId) && list.ownerId !== userId);
            const combinedLists = [...loadedLists, ...shared.filter(s => !loadedLists.some(o => o.id === s.id))];
            return combinedLists;
          });
          setLoading(false);
        },
        error => {
          console.error("Erreur d'abonnement aux listes possédées:", error);
          Alert.alert('Erreur', 'Problème de connexion à vos listes de courses.');
          setLoading(false);
        }
      );

    // Listener pour les listes partagées avec l'utilisateur
    const sharedListsSubscriber = firestore()
      .collection('shoppingLists')
      .where('sharedWith', 'array-contains', userId)
      .orderBy('lastModified', 'desc')
      .onSnapshot(
        querySnapshot => {
          const loadedLists: ShoppingList[] = [];
          querySnapshot.forEach(documentSnapshot => {
            loadedLists.push({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            } as ShoppingList);
          });
          setMyLists(prevLists => {
            const owned = prevLists.filter(list => list.ownerId === userId);
            const combinedLists = [...owned, ...loadedLists.filter(s => !owned.some(o => o.id === s.id))];
            return combinedLists;
          });
          setLoading(false);
        },
        error => {
          console.error("Erreur d'abonnement aux listes partagées:", error);
        }
      );

    return () => {
      ownedListsSubscriber();
      sharedListsSubscriber();
    };
  }, []);

  const handleCreateList = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    if (!newListName.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un nom à la liste.');
      return;
    }

    setCreatingList(true);
    try {
      const newListRef = await firestore().collection('shoppingLists').add({
        name: newListName.trim(),
        ownerId: userId,
        sharedWith: [], // Initialement personne
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastModified: firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert('Succès', 'Liste créée avec succès !');
      setNewListName('');
      setIsCreateModalVisible(false);
      navigation.navigate('ShoppingListDetail', { listId: newListRef.id }); // Naviguer vers la nouvelle liste
    } catch (error) {
      console.error('Erreur lors de la création de la liste:', error);
      Alert.alert('Erreur', 'Impossible de créer la liste. Veuillez réessayer.');
    } finally {
      setCreatingList(false);
    }
  };

  const handleJoinList = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    if (!listToJoinId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer l\'ID de la liste.');
      return;
    }

    setJoiningList(true);
    try {
      const listDoc = await firestore().collection('shoppingLists').doc(listToJoinId.trim()).get();

      if (!listDoc.exists) {
        Alert.alert('Erreur', 'Liste de courses introuvable.');
        return;
      }

      const listData = listDoc.data() as ShoppingList;
      if (listData.ownerId === userId || listData.sharedWith.includes(userId)) {
        Alert.alert('Info', 'Vous faites déjà partie de cette liste.');
        setIsJoinModalVisible(false);
        navigation.navigate('ShoppingListDetail', { listId: listToJoinId.trim() });
        return;
      }

      // Ajouter l'utilisateur à la liste des partagés
      await firestore().collection('shoppingLists').doc(listToJoinId.trim()).update({
        sharedWith: firestore.FieldValue.arrayUnion(userId),
        lastModified: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Succès', 'Vous avez rejoint la liste de courses !');
      setListToJoinId('');
      setIsJoinModalVisible(false);
      navigation.navigate('ShoppingListDetail', { listId: listToJoinId.trim() });
    } catch (error) {
      console.error('Erreur lors de l\'adhésion à la liste:', error);
      Alert.alert('Erreur', 'Impossible de rejoindre la liste. Veuillez réessayer.');
    } finally {
      setJoiningList(false);
    }
  };

  const handleDeleteList = (listId: string, listName: string, ownerId: string) => {
    const userId = auth().currentUser?.uid;
    if (ownerId !== userId) {
        Alert.alert('Permission refusée', 'Seul le propriétaire peut supprimer la liste.');
        return;
    }
    Alert.alert(
      'Supprimer la liste',
      `Voulez-vous vraiment supprimer la liste "${listName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              // Optionnel: Supprimer tous les items de la sous-collection avant de supprimer la liste principale
              const itemsSnapshot = await firestore().collection('shoppingLists').doc(listId).collection('items').get();
              const batch = firestore().batch();
              itemsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              await batch.commit();

              await firestore().collection('shoppingLists').doc(listId).delete();
              Alert.alert('Succès', `"${listName}" a été supprimée.`);
            } catch (error) {
              console.error('Erreur lors de la suppression de la liste:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la liste.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement de vos listes de courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Listes de Courses</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setIsCreateModalVisible(true)}>
          <Icon name="add-circle-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Créer une liste</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setIsJoinModalVisible(true)}>
          <Icon name="people-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Rejoindre une liste</Text>
        </TouchableOpacity>
      </View>

      {myLists.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Icon name="receipt-outline" size={60} color="#ccc" />
          <Text style={styles.emptyListText}>Aucune liste de courses pour l'instant.</Text>
          <Text style={styles.emptyListText}>Créez-en une ou rejoignez-en une !</Text>
        </View>
      ) : (
        <FlatList
          data={myLists}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => navigation.navigate('ShoppingListDetail', { listId: item.id })}
            >
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listMeta}>
                  {item.ownerId === auth().currentUser?.uid ? 'Mon propriétaire' : 'Partagée'}
                  {item.sharedWith.length > 0 && item.ownerId === auth().currentUser?.uid && ` (${item.sharedWith.length} partagée)`}
                </Text>
              </View>
              {item.ownerId === auth().currentUser?.uid && (
                 <TouchableOpacity
                    onPress={() => handleDeleteList(item.id, item.name, item.ownerId)}
                    style={styles.deleteButton}
                >
                    <Icon name="trash-outline" size={20} color="#dc3545" />
                </TouchableOpacity>
              )}
               {item.sharedWith.includes(auth().currentUser?.uid || '') && item.ownerId !== auth().currentUser?.uid && (
                <TouchableOpacity
                    onPress={async () => {
                        const userId = auth().currentUser?.uid;
                        if (!userId) return;
                        Alert.alert(
                            'Quitter la liste',
                            `Voulez-vous vraiment quitter la liste "${item.name}" ?`,
                            [
                                { text: 'Annuler', style: 'cancel' },
                                {
                                    text: 'Quitter',
                                    onPress: async () => {
                                        try {
                                            await firestore().collection('shoppingLists').doc(item.id).update({
                                                sharedWith: firestore.FieldValue.arrayRemove(userId),
                                                lastModified: firestore.FieldValue.serverTimestamp(),
                                            });
                                            Alert.alert('Succès', 'Vous avez quitté la liste.');
                                        } catch (error) {
                                            console.error("Erreur lors du retrait de la liste:", error);
                                            Alert.alert('Erreur', 'Impossible de quitter la liste.');
                                        }
                                    },
                                    style: 'destructive',
                                },
                            ]
                        );
                    }}
                    style={styles.deleteButton}
                >
                    <Icon name="exit-outline" size={20} color="#ff8c00" />
                </TouchableOpacity>
            )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal Créer une liste */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCreateModalVisible}
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer une nouvelle liste</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de la liste"
              value={newListName}
              onChangeText={setNewListName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsCreateModalVisible(false)}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, creatingList && styles.saveButtonDisabled]}
                onPress={handleCreateList}
                disabled={creatingList}
              >
                {creatingList ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Créer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Rejoindre une liste */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isJoinModalVisible}
        onRequestClose={() => setIsJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejoindre une liste existante</Text>
            <TextInput
              style={styles.input}
              placeholder="ID de la liste à rejoindre"
              value={listToJoinId}
              onChangeText={setListToJoinId}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsJoinModalVisible(false)}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, joiningList && styles.saveButtonDisabled]}
                onPress={handleJoinList}
                disabled={joiningList}
              >
                {joiningList ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Rejoindre</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: 'green',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  listCard: {
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
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 5,
  },
  // Modal styles (shared)
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: 'green',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#aaddaa',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShoppingListsScreen;