import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

// IMPORTEZ CECI POUR LES TYPES FIRESTORE
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Structure d'un plat dans la collection 'plats' (pour l'affichage)
interface Plat {
  id: string;
  nom: string;
  imageUrl?: string;
}

// Structure d'un repas dans la collection 'repasHistorique'
interface RepasHistorique {
  id: string;
  platId: string;
  nomPlat: string;
  // Utilisez le type importé ici
  datePreparation: FirebaseFirestoreTypes.FieldValue;
  portionsPreparees?: number;
}

const HistoriqueScreen: React.FC = () => {
  const [repasHistorique, setRepasHistorique] = useState<RepasHistorique[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [platsDisponibles, setPlatsDisponibles] = useState<Plat[]>([]);
  const [selectedPlat, setSelectedPlat] = useState<Plat | null>(null);
  const [portionsInput, setPortionsInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    // Abonnement à l'historique des repas
    const historiqueSubscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('repasHistorique')
      .orderBy('datePreparation', 'desc') // Les plus récents en premier
      .onSnapshot(
        querySnapshot => {
          const loadedRepas: RepasHistorique[] = [];
          querySnapshot.forEach(documentSnapshot => {
            loadedRepas.push({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            } as RepasHistorique);
          });
          setRepasHistorique(loadedRepas);
          setLoading(false);
        },
        error => {
          console.error("Erreur d'abonnement à l'historique des repas:", error);
          Alert.alert('Erreur', 'Problème de connexion à l\'historique des repas.');
          setLoading(false);
        }
      );

    // Chargement des plats de l'utilisateur pour le sélecteur
    const platsSubscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('plats')
      .orderBy('nom', 'asc')
      .onSnapshot(
        querySnapshot => {
          const loadedPlats: Plat[] = [];
          querySnapshot.forEach(documentSnapshot => {
            loadedPlats.push({
              id: documentSnapshot.id,
              nom: documentSnapshot.data().nom,
              imageUrl: documentSnapshot.data().imageUrl,
            });
          });
          setPlatsDisponibles(loadedPlats);
        },
        error => {
          console.error("Erreur de chargement des plats pour la sélection:", error);
        }
      );

    return () => {
      historiqueSubscriber();
      platsSubscriber();
    };
  }, []);

  const handleAddRepas = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    if (!selectedPlat) {
      Alert.alert('Erreur', 'Veuillez sélectionner un plat.');
      return;
    }

    setSavingMeal(true);
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('repasHistorique')
        .add({
          platId: selectedPlat.id,
          nomPlat: selectedPlat.nom,
          // Utilisez firestore.Timestamp.fromDate pour la date
          datePreparation: firestore.Timestamp.fromDate(selectedDate),
          portionsPreparees: portionsInput ? parseInt(portionsInput, 10) : undefined,
          createdAt: firestore.FieldValue.serverTimestamp(), // Pour suivi interne
        });
      Alert.alert('Succès', `${selectedPlat.nom} a été ajouté à l'historique !`);
      resetModal();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du repas à l\'historique:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le repas. Veuillez réessayer.');
    } finally {
      setSavingMeal(false);
    }
  };

  const handleDeleteRepas = (repasId: string, nomPlat: string) => {
    Alert.alert(
      'Supprimer un repas',
      `Voulez-vous vraiment supprimer "${nomPlat}" de votre historique ?`,
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
              await firestore()
                .collection('users')
                .doc(userId)
                .collection('repasHistorique')
                .doc(repasId)
                .delete();
              Alert.alert('Succès', `${nomPlat} a été supprimé de l'historique.`);
            } catch (error) {
              console.error('Erreur lors de la suppression du repas:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le repas.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const resetModal = () => {
    setIsModalVisible(false);
    setSelectedPlat(null);
    setPortionsInput('');
    setSelectedDate(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Cache le picker sur iOS après sélection
    if (date) {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        return newDate;
      });
      // Pour iOS, si le mode est date, on peut montrer le time picker après
      if (Platform.OS === 'ios' && event.type === 'set' && !showTimePicker) {
        setShowTimePicker(true);
      }
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios'); // Cache le picker sur iOS après sélection
    if (time) {
      setSelectedDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
        return newDate;
      });
    }
  };

  // Utilisez le type importé ici
  const formatDateDisplay = (timestamp: FirebaseFirestoreTypes.FieldValue | null | undefined): string => {
    if (!timestamp) return 'Date inconnue';
    // Assurez-vous que timestamp est bien un objet Timestamp de Firestore
    const date = (timestamp as FirebaseFirestoreTypes.Timestamp).toDate();
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement de l'historique des repas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique des Repas</Text>

      <TouchableOpacity style={styles.addRepasButton} onPress={() => setIsModalVisible(true)}>
        <Icon name="add-circle-outline" size={24} color="white" />
        <Text style={styles.addRepasButtonText}>Enregistrer un repas</Text>
      </TouchableOpacity>

      {repasHistorique.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Icon name="fast-food-outline" size={60} color="#ccc" />
          <Text style={styles.emptyListText}>Aucun repas enregistré pour l'instant.</Text>
          <Text style={styles.emptyListText}>Enregistrez votre premier repas ci-dessus !</Text>
        </View>
      ) : (
        <FlatList
          data={repasHistorique}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.repasCard}>
              <View style={styles.repasInfo}>
                <Text style={styles.repasName}>{item.nomPlat}</Text>
                <Text style={styles.repasDetails}>
                  Préparé le: {formatDateDisplay(item.datePreparation)}
                </Text>
                {item.portionsPreparees && (
                  <Text style={styles.repasDetails}>
                    Portions: {item.portionsPreparees}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteRepas(item.id, item.nomPlat)}
                style={styles.deleteButton}
              >
                <Icon name="trash-outline" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal pour enregistrer un nouveau repas */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enregistrer un repas</Text>

            {platsDisponibles.length === 0 ? (
              <Text style={styles.noPlatsText}>Vous n'avez pas de plats enregistrés. Ajoutez-en un d'abord !</Text>
            ) : (
              <FlatList
                data={platsDisponibles}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.platSelectItem,
                      selectedPlat?.id === item.id && styles.platSelected,
                    ]}
                    onPress={() => setSelectedPlat(item)}
                  >
                    {item.imageUrl ? (
                      // Si vous avez une image, utilisez <Image source={{ uri: item.imageUrl }} style={styles.platImage} />
                      // Pour l'instant, un icône ou du texte si pas d'image
                      <Icon name="image-outline" size={24} color="#555" />
                    ) : (
                      <Icon name="fast-food-outline" size={24} color="#555" />
                    )}
                    <Text style={styles.platSelectItemText}>{item.nom}</Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.platSelectContainer}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Nombre de portions (facultatif)"
              keyboardType="numeric"
              value={portionsInput}
              onChangeText={setPortionsInput}
            />

            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-outline" size={20} color="#333" />
              <Text style={styles.datePickerButtonText}>Date: {selectedDate.toLocaleDateString('fr-FR')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowTimePicker(true)}>
              <Icon name="time-outline" size={20} color="#333" />
              <Text style={styles.datePickerButtonText}>Heure: {selectedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetModal}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, savingMeal && styles.saveButtonDisabled]}
                onPress={handleAddRepas}
                disabled={!selectedPlat || savingMeal}
              >
                {savingMeal ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Enregistrer</Text>
                )}
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
  addRepasButton: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addRepasButtonText: {
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
  repasCard: {
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
  repasInfo: {
    flex: 1,
  },
  repasName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  repasDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 5,
  },
  // Modal styles
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
    maxHeight: '80%',
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
  noPlatsText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 15,
  },
  platSelectContainer: {
    paddingVertical: 10,
    marginBottom: 15,
  },
  platSelectItem: {
    padding: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100, // Largeur fixe pour les éléments
  },
  platSelected: {
    borderColor: 'green',
    borderWidth: 2,
    backgroundColor: '#e6ffe6',
  },
  platSelectItemText: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    color: '#333',
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  datePickerButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
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

export default HistoriqueScreen;