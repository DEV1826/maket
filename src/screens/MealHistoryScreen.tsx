// src/screens/MealHistoryScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { COLORS } from '../constants/colors';
import DateTimePicker from '@react-native-community/datetimepicker';

interface RepasHistorique {
  id: string;
  platId: string;
  nomPlat: string;
  datePreparation: FirebaseFirestoreTypes.Timestamp;
  portionsPreparees?: number;
}

type FilterPreset = 'all' | 'week' | 'month';

const startOfWeek = (d: Date) => {
  const c = new Date(d);
  const day = c.getDay();
  const diff = c.getDate() - day + (day === 0 ? -6 : 1);
  c.setDate(diff);
  c.setHours(0, 0, 0, 0);
  return c;
};

const startOfMonth = (d: Date) => {
  const c = new Date(d);
  c.setDate(1);
  c.setHours(0, 0, 0, 0);
  return c;
};

const MealHistoryScreen: React.FC = () => {
  const [items, setItems] = useState<RepasHistorique[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterPreset>('all');
  const [search, setSearch] = useState('');
  const [lastDoc, setLastDoc] = useState<FirebaseFirestoreTypes.DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  // Add modal and creation state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [platsDisponibles, setPlatsDisponibles] = useState<{ id: string; nom: string }[]>([]);
  const [selectedPlat, setSelectedPlat] = useState<{ id: string; nom: string } | null>(null);
  const [portionsInput, setPortionsInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);

  const userId = auth().currentUser?.uid;

  const dateBounds = useMemo(() => {
    const now = new Date();
    if (filter === 'week') {
      return { from: startOfWeek(now), to: new Date() };
    }
    if (filter === 'month') {
      return { from: startOfMonth(now), to: new Date() };
    }
    return null;
  }, [filter]);

  const baseQuery = useCallback(() => {
    if (!userId) return null;
    let q: FirebaseFirestoreTypes.Query = firestore()
      .collection('users')
      .doc(userId)
      .collection('repasHistorique')
      .orderBy('datePreparation', 'desc');

    if (dateBounds) {
      q = q
        .where('datePreparation', '>=', firestore.Timestamp.fromDate(dateBounds.from))
        .where('datePreparation', '<=', firestore.Timestamp.fromDate(dateBounds.to));
    }
    return q;
  }, [userId, dateBounds]);

  // Load user's plats for picker
  useEffect(() => {
    if (!userId) return;
    const sub = firestore()
      .collection('users')
      .doc(userId)
      .collection('plats')
      .orderBy('nom', 'asc')
      .onSnapshot(
        qs => {
          const arr = qs.docs.map(d => ({ id: d.id, nom: (d.data() as any).nom || '' }));
          setPlatsDisponibles(arr);
        },
        err => {
          console.error('Error loading plats for picker:', err);
        }
      );
    return () => sub();
  }, [userId]);

  const loadFirstPage = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setHasMore(true);
      const q = baseQuery();
      if (!q) return;
      const snap = await q.limit(20).get();
      const data: RepasHistorique[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
      setItems(data);
      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      setHasMore(snap.docs.length === 20);
    } finally {
      setLoading(false);
    }
  }, [userId, baseQuery]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !lastDoc) return;
    const q = baseQuery();
    if (!q) return;
    const snap = await q.startAfter(lastDoc).limit(20).get();
    const data: RepasHistorique[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
    setItems(prev => [...prev, ...data]);
    setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
    setHasMore(snap.docs.length === 20);
  }, [hasMore, lastDoc, baseQuery]);

  useEffect(() => {
    loadFirstPage();
  }, [filter, loadFirstPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(i => i.nomPlat?.toLowerCase().includes(term));
  }, [items, search]);

  const grouped = useMemo(() => {
    const groups: { title: string; data: RepasHistorique[] }[] = [];
    const byDay = new Map<string, RepasHistorique[]>();
    filtered.forEach(it => {
      const date = it.datePreparation?.toDate?.() || new Date();
      const key = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
      const arr = byDay.get(key) || [];
      arr.push(it);
      byDay.set(key, arr);
    });
    Array.from(byDay.entries()).forEach(([k, v]) => groups.push({ title: k, data: v }));
    return groups;
  }, [filtered]);

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.filters}>
        {(['all','week','month'] as FilterPreset[]).map(p => (
          <TouchableOpacity key={p} onPress={() => setFilter(p)} style={[styles.chip, filter === p && styles.chipActive]}>
            <Text style={[styles.chipText, filter === p && styles.chipTextActive]}>
              {p === 'all' ? 'Tous' : p === 'week' ? 'Semaine' : 'Mois'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={COLORS.lightGray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un plat..."
          placeholderTextColor={COLORS.lightGray}
          value={search}
          onChangeText={setSearch}
        />
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: RepasHistorique }) => {
    const date = item.datePreparation?.toDate?.() || new Date();
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Icon name="restaurant" size={20} color={COLORS.accent} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.nomPlat}</Text>
          <Text style={styles.cardSub}>
            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {item.portionsPreparees ? ` • ${item.portionsPreparees} portion(s)` : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderGroupHeader = ({ title }: { title: string }) => (
    <View style={styles.groupHeader}>
      <Text style={styles.groupHeaderText}>{title}</Text>
    </View>
  );

  const resetModal = () => {
    setIsModalVisible(false);
    setSelectedPlat(null);
    setPortionsInput('');
    setSelectedDate(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const onDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(prev => {
        const d = new Date(prev);
        d.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        return d;
      });
      if (Platform.OS === 'ios' && !showTimePicker) setShowTimePicker(true);
    }
  };

  const onTimeChange = (_event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedDate(prev => {
        const d = new Date(prev);
        d.setHours(time.getHours(), time.getMinutes(), 0, 0);
        return d;
      });
    }
  };

  const handleAddMeal = async () => {
    if (!userId) return;
    if (!selectedPlat) return;
    setSavingMeal(true);
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('repasHistorique')
        .add({
          platId: selectedPlat.id,
          nomPlat: selectedPlat.nom,
          datePreparation: firestore.Timestamp.fromDate(selectedDate),
          portionsPreparees: portionsInput ? parseInt(portionsInput, 10) : undefined,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      resetModal();
      // Refresh list
      loadFirstPage();
    } catch (e) {
      console.error('Error adding meal history:', e);
    } finally {
      setSavingMeal(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Chargement de l'historique...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={Header}
        data={grouped}
        keyExtractor={(g) => g.title}
        renderItem={({ item }) => (
          <View>
            {renderGroupHeader({ title: item.title })}
            {item.data.map(d => (
              <View key={d.id}>{renderItem({ item: d })}</View>
            ))}
          </View>
        )}
        onEndReached={() => loadMore()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="fast-food-outline" size={56} color={COLORS.gray} />
            <Text style={styles.emptyText}>Aucun repas pour la période sélectionnée.</Text>
          </View>
        }
      />
      {/* Floating add meal button */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
        <Icon name="add" size={26} color={COLORS.white} />
      </TouchableOpacity>

      {/* Modal add meal */}
      <Modal transparent animationType="slide" visible={isModalVisible} onRequestClose={resetModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un repas</Text>

            <View style={styles.platPickerRow}>
              <FlatList
                data={platsDisponibles}
                keyExtractor={(p) => p.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.platChip, selectedPlat?.id === item.id && styles.platChipActive]}
                    onPress={() => setSelectedPlat(item)}
                  >
                    <Icon name="fast-food-outline" size={16} color={selectedPlat?.id === item.id ? COLORS.white : COLORS.lightGray} />
                    <Text style={[styles.platChipText, selectedPlat?.id === item.id && styles.platChipTextActive]} numberOfLines={1}>
                      {item.nom}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre de portions (facultatif)"
              placeholderTextColor={COLORS.lightGray}
              keyboardType="numeric"
              value={portionsInput}
              onChangeText={setPortionsInput}
            />

            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-outline" size={18} color={COLORS.white} />
              <Text style={styles.pickerButtonText}>Date: {selectedDate.toLocaleDateString('fr-FR')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
              <Icon name="time-outline" size={18} color={COLORS.white} />
              <Text style={styles.pickerButtonText}>Heure: {selectedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker value={selectedDate} mode="date" display="default" onChange={onDateChange} />
            )}
            {showTimePicker && (
              <DateTimePicker value={selectedDate} mode="time" display="default" onChange={onTimeChange} />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetModal}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!selectedPlat || savingMeal) && styles.saveButtonDisabled]}
                onPress={handleAddMeal}
                disabled={!selectedPlat || savingMeal}
              >
                {savingMeal ? (
                  <ActivityIndicator color={COLORS.white} />
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
    backgroundColor: COLORS.primaryDark,
  },
  content: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
    borderBottomWidth: 1,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.lightGray,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    marginLeft: 8,
  },
  groupHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  groupHeaderText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  cardLeft: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    paddingLeft: 8,
  },
  cardTitle: {
    color: COLORS.white,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    color: COLORS.lightGray,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
  },
  loadingText: {
    color: COLORS.lightGray,
    marginTop: 10,
  },
  empty: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: COLORS.lightGray,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  modalTitle: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  platPickerRow: {
    paddingVertical: 8,
  },
  platChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 16,
  },
  platChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  platChipText: {
    color: COLORS.lightGray,
    maxWidth: 140,
  },
  platChipTextActive: {
    color: COLORS.white,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: COLORS.primaryDark,
    color: COLORS.white,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  pickerButtonText: {
    color: COLORS.white,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default MealHistoryScreen;
