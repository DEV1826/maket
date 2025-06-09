
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
import { Timestamp } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface BudgetEntry {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: FirebaseFirestoreTypes.Timestamp;
  type: 'expense' | 'income';
}

const categories = ['Épicerie', 'Restaurant', 'Boissons', 'Livraison', 'Autres'];

const BudgetManagementScreen: React.FC = () => {
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]); // Default category
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);

  const userId = auth().currentUser?.uid;

  useEffect(() => {
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('budgetEntries')
      .orderBy('date', 'desc')
      .onSnapshot(
        querySnapshot => {
          const loadedEntries: BudgetEntry[] = [];
          querySnapshot.forEach(documentSnapshot => {
            loadedEntries.push({
              ...documentSnapshot.data() as BudgetEntry,
            });
          });
          setBudgetEntries(loadedEntries);
          setLoading(false);
        },
        error => {
          console.error('Error fetching budget entries:', error);
          Alert.alert('Erreur', 'Impossible de charger les entrées de budget.');
          setLoading(false);
        }
      );

    return () => subscriber();
  }, [userId]);

  const totalExpenses = budgetEntries.reduce((sum, entry) => {
    return sum + (entry.type === 'expense' ? entry.amount : 0);
  }, 0);

  const handleAddEntry = async () => {
    if (!userId) return;
    if (!newAmount || isNaN(parseFloat(newAmount)) || parseFloat(newAmount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (!newDescription.trim()) {
      Alert.alert('Erreur', 'Veuillez ajouter une description.');
      return;
    }

    setAddingEntry(true);
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('budgetEntries')
        .add({
          amount: parseFloat(newAmount),
          category: newCategory,
          description: newDescription.trim(),
          date: FirebaseFirestoreTypes.Timestamp.fromDate(newDate),
          type: 'expense', // For now, only 'expense'
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      Alert.alert('Succès', 'Dépense ajoutée !');
      resetModal();
    } catch (error) {
      console.error('Error adding budget entry:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la dépense. Veuillez réessayer.');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleDeleteEntry = (entryId: string, description: string) => {
    Alert.alert(
      'Supprimer la dépense',
      `Voulez-vous vraiment supprimer "${description}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            if (!userId) return;
            try {
              await firestore()
                .collection('users')
                .doc(userId)
                .collection('budgetEntries')
                .doc(entryId)
                .delete();
              Alert.alert('Succès', 'Dépense supprimée.');
            } catch (error) {
              console.error('Error deleting budget entry:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la dépense.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const resetModal = () => {
    setIsAddModalVisible(false);
    setNewAmount('');
    setNewCategory(categories[0]);
    setNewDescription('');
    setNewDate(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setNewDate(prevDate => {
        const tempDate = new Date(prevDate);
        tempDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        return tempDate;
      });
      if (Platform.OS === 'ios' && event.type === 'set' && !showTimePicker) {
        setShowTimePicker(true);
      }
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setNewDate(prevDate => {
        const tempDate = new Date(prevDate);
        tempDate.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
        return tempDate;
      });
    }
  };

  const formatDateDisplay = (timestamp: FirebaseFirestoreTypes.Timestamp | null | undefined): string => {
    if (!timestamp) return 'Date inconnue';
    const date = timestamp.toDate();
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
        <Text>Chargement du budget...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestion du Budget</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Dépenses Totales :</Text>
        <Text style={styles.totalAmount}>${totalExpenses.toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.addEntryButton} onPress={() => setIsAddModalVisible(true)}>
        <Icon name="add-circle-outline" size={24} color="white" />
        <Text style={styles.addEntryButtonText}>Ajouter une dépense</Text>
      </TouchableOpacity>

      {budgetEntries.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Icon name="cash-outline" size={60} color="#ccc" />
          <Text style={styles.emptyListText}>Aucune dépense enregistrée pour l'instant.</Text>
          <Text style={styles.emptyListText}>Ajoutez votre première dépense !</Text>
        </View>
      ) : (
        <FlatList
          data={budgetEntries}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryDescription}>{item.description}</Text>
                <Text style={styles.entryCategory}>{item.category}</Text>
                <Text style={styles.entryDate}>{formatDateDisplay(item.date)}</Text>
              </View>
              <Text style={styles.entryAmount}>-${item.amount.toFixed(2)}</Text>
              <TouchableOpacity
                onPress={() => handleDeleteEntry(item.id, item.description)}
                style={styles.deleteButton}
              >
                <Icon name="trash-outline" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal pour ajouter une dépense */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter une nouvelle dépense</Text>

            <TextInput
              style={styles.input}
              placeholder="Montant (ex: 45.50)"
              keyboardType="numeric"
              value={newAmount}
              onChangeText={setNewAmount}
            />

            <View style={styles.categoryPicker}>
              <Text style={styles.pickerLabel}>Catégorie:</Text>
              <FlatList
                data={categories}
                keyExtractor={item => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      newCategory === item && styles.categoryButtonSelected,
                    ]}
                    onPress={() => setNewCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        newCategory === item && styles.categoryButtonTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Description (ex: Courses Supermarché)"
              value={newDescription}
              onChangeText={setNewDescription}
            />

            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-outline" size={20} color="#333" />
              <Text style={styles.datePickerButtonText}>Date: {newDate.toLocaleDateString('fr-FR')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowTimePicker(true)}>
              <Icon name="time-outline" size={20} color="#333" />
              <Text style={styles.datePickerButtonText}>Heure: {newDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={newDate}
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
                style={[styles.saveButton, addingEntry && styles.saveButtonDisabled]}
                onPress={handleAddEntry}
                disabled={addingEntry}
              >
                {addingEntry ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Ajouter</Text>
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
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#dc3545', // Red for expenses
  },
  addEntryButton: {
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
  addEntryButtonText: {
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
  entryCard: {
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
  entryInfo: {
    flex: 1,
  },
  entryDescription: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entryCategory: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  entryDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  entryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginLeft: 10,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  categoryPicker: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonSelected: {
    backgroundColor: 'green',
    borderColor: 'green',
  },
  categoryButtonText: {
    color: '#555',
    fontSize: 14,
  },
  categoryButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
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

export default BudgetManagementScreen;