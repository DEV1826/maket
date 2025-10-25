// src/screens/MealPlannerScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';

// Helper pour formater les dates
const getMonday = (d: Date): Date => {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
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
  startDate: FirebaseFirestoreTypes.Timestamp;
  endDate: FirebaseFirestoreTypes.Timestamp;
  plan: { [key: string]: MealPlanDay };
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
  const [refreshing, setRefreshing] = useState(false);

  const userId = auth().currentUser?.uid;

  // Animated press utility
  const usePressScale = () => {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
    return { scale, onPressIn, onPressOut };
  };

  // Fetch user's dishes
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const platsSubscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('plats')
      .onSnapshot(
        querySnapshot => {
          const loadedPlats: Plat[] = [];
          querySnapshot.forEach(doc => loadedPlats.push({ id: doc.id, ...(doc.data() as any) } as Plat));
          setPlats(loadedPlats);
        },
        error => {
          console.error('Error fetching plats:', error);
          Alert.alert('Erreur', 'Impossible de charger vos plats.');
        }
      );
    return () => platsSubscriber();
  }, [userId]);

  // Fetch meal plan for the current week
  useEffect(() => {
    if (!userId) {
      setLoading(false);
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
            const nextSunday = new Date(currentWeekMonday);
            nextSunday.setDate(currentWeekMonday.getDate() + 6);
            nextSunday.setHours(23, 59, 59, 999);
            setMealPlan({
              startDate: firestore.Timestamp.fromDate(currentWeekMonday),
              endDate: firestore.Timestamp.fromDate(nextSunday),
              plan: {},
            });
          }
          setLoading(false);
          setRefreshing(false);
        },
        error => {
          console.error('Error fetching meal plan:', error);
          Alert.alert('Erreur', 'Impossible de charger le plan de repas.');
          setLoading(false);
          setRefreshing(false);
        }
      );

    return () => mealPlanSubscriber();
  }, [userId, currentWeekMonday]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Trigger a no-op refresh; the listener will update and setRefreshing(false)
    // Alternatively, briefly toggle week to force refresh
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handlePreviousWeek = useCallback(() => {
    setCurrentWeekMonday(prevMonday => {
      const newMonday = new Date(prevMonday);
      newMonday.setDate(prevMonday.getDate() - 7);
      return newMonday;
    });
    setLoading(true);
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekMonday(prevMonday => {
      const newMonday = new Date(prevMonday);
      newMonday.setDate(prevMonday.getDate() + 7);
      return newMonday;
    });
    setLoading(true);
  }, []);

  const openPlatPicker = (day: string, mealType: MealType) => {
    setSelectedDay(day);
    setSelectedMealType(mealType);
    setIsPlatPickerVisible(true);
  };

  const selectPlat = async (plat: Plat | null) => {
    setIsPlatPickerVisible(false);
    if (!userId || !mealPlan) return;

    setSavingPlan(true);

    const docId = formatDateToYYYYMMDD(currentWeekMonday);
    const updatedPlan = { ...mealPlan.plan } as { [k: string]: MealPlanDay };

    if (!updatedPlan[selectedDay]) {
      updatedPlan[selectedDay] = {};
    }

    if (plat) {
      const idKey = `${selectedMealType}PlatId` as keyof MealPlanDay;
      const nameKey = `${selectedMealType}PlatName` as keyof MealPlanDay;
      (updatedPlan[selectedDay] as MealPlanDay)[idKey] = plat.id;
      (updatedPlan[selectedDay] as MealPlanDay)[nameKey] = plat.nom;
    } else {
      delete (updatedPlan[selectedDay] as MealPlanDay)[`${selectedMealType}PlatId` as keyof MealPlanDay];
      delete (updatedPlan[selectedDay] as MealPlanDay)[`${selectedMealType}PlatName` as keyof MealPlanDay];
    }

    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('mealPlans')
        .doc(docId)
        .set(
          {
            startDate: firestore.Timestamp.fromDate(currentWeekMonday),
            endDate: mealPlan.endDate,
            plan: updatedPlan,
            lastModified: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
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
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Chargement du plan de repas...</Text>
      </View>
    );
  }

  const weekRangeStart = currentWeekMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const weekRangeEnd = new Date(currentWeekMonday);
  weekRangeEnd.setDate(currentWeekMonday.getDate() + 6);
  const weekRangeEndFormatted = weekRangeEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const ArrowButton: React.FC<{ direction: 'back' | 'forward'; onPress: () => void }> = ({ direction, onPress }) => {
    const { scale, onPressIn, onPressOut } = usePressScale();
    const iconName = direction === 'back' ? 'chevron-back-outline' : 'chevron-forward-outline';
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.navButton}>
          <Icon name={iconName} size={28} color={COLORS.accent} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const MealRow: React.FC<{ mealType: MealType; label: string; dayKey: string; currentDayPlan: MealPlanDay }> = ({ mealType, label, dayKey, currentDayPlan }) => {
    const { scale, onPressIn, onPressOut } = usePressScale();
    const icon = mealType === 'morning' ? 'sunny-outline' : mealType === 'noon' ? 'restaurant-outline' : 'moon-outline';
    return (
      <View style={styles.mealRow}>
        <View style={styles.mealLabelWrap}>
          <Icon name={icon} size={16} color={COLORS.accent} />
          <Text style={styles.mealTypeLabel}>{label}:</Text>
        </View>
        <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
          <TouchableOpacity
            style={styles.platSelectionButton}
            onPress={() => openPlatPicker(dayKey, mealType)}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <Text numberOfLines={1} style={styles.platSelectionText}>
              {currentDayPlan[`${mealType}PlatName` as keyof MealPlanDay] || 'Ajouter un plat'}
            </Text>
            <Icon name="chevron-forward-outline" size={18} color={COLORS.lightGray} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sticky header / week navigator */}
      <View style={styles.weekNavigator}>
        <ArrowButton direction="back" onPress={handlePreviousWeek} />
        <View style={styles.weekRangeWrap}>
          <Text style={styles.title}>Planification des Repas</Text>
          <Text style={styles.weekRangeText}>
            Semaine du {weekRangeStart} - {weekRangeEndFormatted}
          </Text>
        </View>
        <ArrowButton direction="forward" onPress={handleNextWeek} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {daysOfWeek.map((dayName) => {
          const dayKey = dayName.toLowerCase();
          const currentDayPlan = (mealPlan?.plan[dayKey] || {}) as MealPlanDay;
          return (
            <View key={dayKey} style={styles.dayCard}>
              <Text style={styles.dayTitle}>{dayName}</Text>
              {mealTypes.map((mt) => (
                <MealRow key={mt} mealType={mt} label={mealTypeLabels[mt]} dayKey={dayKey} currentDayPlan={currentDayPlan} />
              ))}
            </View>
          );
        })}
      </ScrollView>

      {savingPlan && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.overlayLoadingText}>Sauvegarde...</Text>
        </View>
      )}

      {/* Modal pour choisir un plat */}
      <Modal animationType="slide" transparent visible={isPlatPickerVisible} onRequestClose={() => setIsPlatPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner un plat</Text>
            <FlatList
              data={plats}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.platListItem} onPress={() => selectPlat(item)}>
                  <Text style={styles.platListItemText}>{item.nom}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyPlatsText}>Vous n'avez pas encore de plats.</Text>}
            />
            <TouchableOpacity style={styles.clearPlatButton} onPress={() => selectPlat(null)}>
              <Text style={styles.clearPlatButtonText}>Effacer le plat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsPlatPickerVisible(false)}>
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
    backgroundColor: COLORS.primaryDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
  },
  loadingText: {
    color: COLORS.lightGray,
    marginTop: 10,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  weekNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryDark,
  },
  weekRangeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    padding: 6,
    borderRadius: 8,
  },
  weekRangeText: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  dayCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLight,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.primaryDark,
  },
  mealLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: 6,
  },
  mealTypeLabel: {
    fontSize: 14,
    color: COLORS.lightGray,
    fontWeight: '600',
  },
  platSelectionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  platSelectionText: {
    fontSize: 14,
    color: COLORS.white,
    flexShrink: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: COLORS.accent,
  },
  platListItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryLight,
  },
  platListItemText: {
    fontSize: 16,
    color: COLORS.white,
  },
  emptyPlatsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: COLORS.lightGray,
  },
  clearPlatButton: {
    backgroundColor: COLORS.primaryDark,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  clearPlatButtonText: {
    color: COLORS.accent,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeModalButton: {
    backgroundColor: COLORS.gray,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  overlayLoading: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.white,
  },
});

export default MealPlannerScreen;