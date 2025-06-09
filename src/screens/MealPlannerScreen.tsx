// src/screens/MealPlannerScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text, // Assurez-vous que Text est importé
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'; // Gardez l'import pour les types
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Helper pour formater les dates
const getMonday = (d: Date): Date => {
  d = new Date(d);
  const day = d.getDay(),
    diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // Set to start of day
  return d;
};

const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface Plat {
  id: string;
  nom: string;
  // Ajoutez d'autres champs si nécessaire (ex: imageUrl)
}

interface MealPlanDay {
  morningPlatId?: string;
  morningPlatName?: string;
  noonPlatId?: string;
  noonPlatName?: string;
  eveningPlatId?: string;
  eveningPlatName?: string;
}

interface MealPlan {
  // Utilisez directement firestore.Timestamp pour l'initialisation et les valeurs
  // mais FirebaseFirestoreTypes.Timestamp pour les types d'interface.
  startDate: FirebaseFirestoreTypes.Timestamp;
  endDate: FirebaseFirestoreTypes.Timestamp;
  plan: {
    [key: string]: MealPlanDay; // monday, tuesday, etc.
  };
}

const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const mealTypes = ['morning', 'noon', 'evening'] as const;

type MealType = typeof mealTypes[number];

const mealTypeLabels: Record<MealType, string> = {
  morning: 'Matin',
  noon: 'Midi',
  evening: 'Soir',
};

const MealPlannerScreen: React.FC = () => {
  const [currentWeekMonday, setCurrentWeekMonday] = useState(getMonday(new Date()));
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [plats, setPlats] = useState<Plat[]>([]);
  const [isPlatPickerVisible, setIsPlatPickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('morning');
  const [savingPlan, setSavingPlan] = useState(false);

  const userId = auth().currentUser?.uid;

  // Fetch user's dishes
  useEffect(() => {
    if (!userId) {
        setLoading(false); // Stop loading if no user
        return;
    }
    const platsSubscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('plats')
      .onSnapshot(
        querySnapshot => {
          const loadedPlats: Plat[] = [];
          querySnapshot.forEach(doc => loadedPlats.push({ id: doc.id, ...doc.data() } as Plat));
          setPlats(loadedPlats);
        },
        error => {
          console.error('Error fetching plats:', error);
          Alert.alert('Erreur', 'Impossible de charger vos plats.'); // Added alert for clarity
        }
      );
    return () => platsSubscriber();
  }, [userId]);

  // Fetch meal plan for the current week
  useEffect(() => {
    if (!userId) {
        setLoading(false); // Stop loading if no user
        return;
    }

    const docId = formatDateToYYYYMMDD(currentWeekMonday);
    const mealPlanSubscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('mealPlans')
      .doc(docId)
      .onSnapshot(
        documentSnapshot => {
          const data = documentSnapshot.data();
          if (data) {
            setMealPlan(data as MealPlan);
          } else {
            // If no plan exists, initialize an empty one for the week
            const nextSunday = new Date(currentWeekMonday);
            nextSunday.setDate(currentWeekMonday.getDate() + 6);
            nextSunday.setHours(23, 59, 59, 999); // End of Sunday

            setMealPlan({
              // Utilisez firestore.Timestamp directement ici
              startDate: firestore.Timestamp.fromDate(currentWeekMonday),
              endDate: firestore.Timestamp.fromDate(nextSunday),
              plan: {}, // Empty plan
            });
          }
          setLoading(false);
        },
        error => {
          console.error('Error fetching meal plan:', error);
          Alert.alert('Erreur', 'Impossible de charger le plan de repas.');
          setLoading(false);
        }
      );

    return () => mealPlanSubscriber();
  }, [userId, currentWeekMonday]);

  const handlePreviousWeek = useCallback(() => {
    setCurrentWeekMonday(prevMonday => {
      const newMonday = new Date(prevMonday);
      newMonday.setDate(prevMonday.getDate() - 7);
      return newMonday;
    });
    setLoading(true); // Re-load plan for new week
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekMonday(prevMonday => {
      const newMonday = new Date(prevMonday);
      newMonday.setDate(prevMonday.getDate() + 7);
      return newMonday;
    });
    setLoading(true); // Re-load plan for new week
  }, []);

  const openPlatPicker = (day: string, mealType: MealType) => { // Utilisez MealType
    setSelectedDay(day);
    setSelectedMealType(mealType);
    setIsPlatPickerVisible(true);
  };

  const selectPlat = async (plat: Plat | null) => {
    setIsPlatPickerVisible(false);
    if (!userId || !mealPlan) return;

    setSavingPlan(true);

    const docId = formatDateToYYYYMMDD(currentWeekMonday);
    const updatedPlan = { ...mealPlan.plan };

    if (!updatedPlan[selectedDay]) {
      updatedPlan[selectedDay] = {};
    }

    // Assign the selected plat or clear it if null
    if (plat) {
      // Les clés sont correctement typées via `MealPlanDay`
      const idKey = `${selectedMealType}PlatId` as keyof MealPlanDay;
      const nameKey = `${selectedMealType}PlatName` as keyof MealPlanDay;
      (updatedPlan[selectedDay] as MealPlanDay)[idKey] = plat.id;
      (updatedPlan[selectedDay] as MealPlanDay)[nameKey] = plat.nom;
    } else {
      // Option pour "effacer" le plat
      delete (updatedPlan[selectedDay] as MealPlanDay)[`${selectedMealType}PlatId`];
      delete (updatedPlan[selectedDay] as MealPlanDay)[`${selectedMealType}PlatName`];
    }

    try {
      // Utilisez firestore.Timestamp directement ici
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('mealPlans')
        .doc(docId)
        .set(
          {
            startDate: firestore.Timestamp.fromDate(currentWeekMonday),
            endDate: mealPlan.endDate, // Keep the original endDate or recalculate if needed
            plan: updatedPlan,
            lastModified: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true } // Merge to avoid overwriting the whole document
        );
      Alert.alert('Succès', 'Plan de repas mis à jour !');
    } catch (error) {
      console.error('Error updating meal plan:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le plan de repas.');
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement du plan de repas...</Text>
      </View>
    );
  }

  const weekRangeStart = currentWeekMonday.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const weekRangeEnd = new Date(currentWeekMonday);
  weekRangeEnd.setDate(currentWeekMonday.getDate() + 6);
  const weekRangeEndFormatted = weekRangeEnd.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Planification des Repas</Text>

      <View style={styles.weekNavigator}>
        <TouchableOpacity onPress={handlePreviousWeek} style={styles.navButton}>
          <Icon name="chevron-back-outline" size={30} color="green" />
        </TouchableOpacity>
        <Text style={styles.weekRangeText}>
          Semaine du {weekRangeStart} - {weekRangeEndFormatted}
        </Text>
        <TouchableOpacity onPress={handleNextWeek} style={styles.navButton}>
          <Icon name="chevron-forward-outline" size={30} color="green" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {daysOfWeek.map((dayName, index) => {
          const dayKey = dayName.toLowerCase();
          const currentDayPlan = mealPlan?.plan[dayKey] || {};

          return (
            <View key={dayKey} style={styles.dayCard}>
              <Text style={styles.dayTitle}>{dayName}</Text>
              {mealTypes.map(mealType => (
                <View key={mealType} style={styles.mealRow}>
                  <Text style={styles.mealTypeLabel}>{mealTypeLabels[mealType]}:</Text>
                  <TouchableOpacity
                    style={styles.platSelectionButton}
                    onPress={() => openPlatPicker(dayKey, mealType)} // dayKey et mealType sont des strings ici
                  >
                    <Text style={styles.platSelectionText}>
                      {currentDayPlan[`${mealType}PlatName`] || 'Ajouter un plat'}
                    </Text>
                    <Icon name="chevron-forward-outline" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {savingPlan && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator size="large" color="green" />
          <Text style={styles.overlayLoadingText}>Sauvegarde...</Text>
        </View>
      )}

      {/* Modal pour choisir un plat */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPlatPickerVisible}
        onRequestClose={() => setIsPlatPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner un plat</Text>
            <FlatList
              data={plats}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.platListItem} onPress={() => selectPlat(item)}>
                  <Text style={styles.platListItemText}>{item.nom}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyPlatsText}>Vous n'avez pas encore de plats.</Text>
              }
            />
            <TouchableOpacity style={styles.clearPlatButton} onPress={() => selectPlat(null)}>
              <Text style={styles.clearPlatButtonText}>Effacer le plat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setIsPlatPickerVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Fermer</Text>
            </TouchableOpacity>
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
  weekNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  navButton: {
    padding: 5,
  },
  weekRangeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  mealTypeLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
    width: 70, // Fixed width for labels
  },
  platSelectionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
    marginLeft: 10,
  },
  platSelectionText: {
    fontSize: 16,
    color: '#333',
    flexShrink: 1,
  },
  // Modal Styles
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
    maxHeight: '70%',
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
  platListItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  platListItemText: {
    fontSize: 17,
    color: '#333',
  },
  emptyPlatsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  clearPlatButton: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  clearPlatButtonText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeModalButton: {
    backgroundColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  overlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default MealPlannerScreen;