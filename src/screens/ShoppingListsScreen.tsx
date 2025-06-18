import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { FAB } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../types/navigation';

type ShoppingListsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ShoppingLists'>;

interface ShoppingList {
  id: string;
  name: string;
  date: string;
  createdAt: any;
}

interface Ingredient {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  imageUrl?: string;
}

interface ShoppingListItem extends Ingredient {
  checked: boolean;
}

const ShoppingListsScreen: React.FC = () => {
  const navigation = useNavigation<ShoppingListsScreenNavigationProp>();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [generating, setGenerating] = useState(false);

  // Format date as YYYY-MM-DD for Firestore keys
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const frenchDayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const frenchMonthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Format date nicely for display in French
  const formatDateForDisplay = (date: Date): string => {
    const dayName = frenchDayNames[date.getDay()];
    const day = date.getDate();
    const month = frenchMonthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName} ${day} ${month} ${year}`;
  };

  useEffect(() => {
    const fetchShoppingLists = async () => {
      try {
        const userId = auth().currentUser?.uid;
        if (!userId) {
          setLoading(false);
          return;
        }

        const unsubscribe = firestore()
          .collection('users')
          .doc(userId)
          .collection('shoppingLists')
          .orderBy('createdAt', 'desc')
          .onSnapshot((snapshot) => {
            const fetchedLists = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as ShoppingList[];
            
            setLists(fetchedLists);
            setLoading(false);
          });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching shopping lists:', error);
        setLoading(false);
      }
    };

    fetchShoppingLists();
  }, []);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);

    if (event.type === 'set' && selectedDate) {
      // Only proceed if 'set' was pressed (not cancel)
      generateShoppingList(currentDate);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const generateShoppingList = async (date: Date) => {
    setGenerating(true);
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        setGenerating(false);
        return;
      }

      const dateKey = formatDateKey(date);
      const displayDate = formatDateForDisplay(date);

      // Check if a list for this date already exists
      const existingListQuery = await firestore()
        .collection('users')
        .doc(userId)
        .collection('shoppingLists')
        .where('date', '==', dateKey)
        .get();

      if (!existingListQuery.empty) {
        // List already exists, navigate to it
        const existingList = existingListQuery.docs[0];
        navigation.navigate('ShoppingListDetail', {
          listId: existingList.id,
        });
        setGenerating(false);
        return;
      }

      // Fetch the meal plan for the selected date
      const mealPlanDoc = await firestore()
        .collection('users')
        .doc(userId)
        .collection('weeklyMeals')
        .doc(dateKey)
        .get();

      if (!mealPlanDoc.exists()) {
        Alert.alert('Info', `Aucun repas prévu pour le ${displayDate}`);
        setGenerating(false);
        return;
      }

      const mealPlanData = mealPlanDoc.data();
      if (!mealPlanData || !mealPlanData.dishIds || mealPlanData.dishIds.length === 0) {
        Alert.alert('Info', `Aucun plat défini pour le ${displayDate}`);
        setGenerating(false);
        return;
      }

      // Fetch dish names for confirmation
      const dishIds = mealPlanData.dishIds;
      const dishPromises = dishIds.map((id: string) =>
        firestore()
          .collection('users')
          .doc(userId)
          .collection('plats')
          .doc(id)
          .get()
      );

      const dishSnapshots = await Promise.all(dishPromises);
      const dishNames: string[] = [];
      const validDishes: any[] = [];

      dishSnapshots.forEach((snap) => {
        if (snap.exists()) {
          const dishData = snap.data();
          if (dishData?.nom) {
            dishNames.push(dishData.nom);
            validDishes.push(dishData);
          }
        }
      });

      if (dishNames.length === 0) {
        Alert.alert('Info', `Aucun plat valide trouvé pour le ${displayDate}`);
        setGenerating(false);
        return;
      }

      // Show confirmation with meal names
      const mealsList = dishNames.join(', ');
      Alert.alert(
        'Confirmer la génération',
        `Repas prévu pour le ${displayDate}:\n\n${mealsList}\n\nVoulez-vous générer la liste de courses pour ces repas ?`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => setGenerating(false),
          },
          {
            text: 'Générer',
            onPress: async () => {
              await proceedWithListGeneration(userId, dateKey, displayDate, validDishes);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in generateShoppingList:', error);
      Alert.alert('Erreur', 'Impossible de récupérer les informations des repas');
      setGenerating(false);
    }
  };

  const proceedWithListGeneration = async (userId: string, dateKey: string, displayDate: string, dishes: any[]) => {
    try {
      const neededIngredients: Ingredient[] = [];

      // Collect all ingredients from dishes
      dishes.forEach((dishData) => {
        const dishIngredients = dishData?.ingredients || [];

        // Ensure ingredients exist and have valid properties
        dishIngredients
          .filter((ing: any) => ing && ing.nom)
          .forEach((ing: any) => {
            const ingName = ing.nom?.toLowerCase() || '';
            if (!ingName) return;

            // Check if this ingredient is already in our list
            const existingIngredient = neededIngredients.find(
              (existing) => (existing.name?.toLowerCase() || '') === ingName
            );

            if (existingIngredient) {
              // Add quantities if the ingredient already exists
              existingIngredient.quantity += parseFloat(ing.quantite) || 0;
            } else {
              // Add new ingredient to the list
              neededIngredients.push({
                name: ing.nom,
                quantity: parseFloat(ing.quantite) || 0,
                unit: ing.unite || '',
              });
            }
          });
      });

      if (neededIngredients.length === 0) {
        Alert.alert('Info', `Aucun ingrédient trouvé pour les plats du ${displayDate}`);
        setGenerating(false);
        return;
      }

      // Fetch current stock from Firestore
      const stockSnapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('stock')
        .get();

      // Create a map of current stock items
      const stockMap: Record<string, number> = {};
      stockSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data && data.nom) {
          const stockQuantity = parseFloat(data.quantite) || 0;
          stockMap[data.nom.toLowerCase()] = stockQuantity;
        }
      });

      // Filter ingredients that need to be bought (not in stock or insufficient quantity)
      const shoppingItems: ShoppingListItem[] = neededIngredients
        .filter((ing) => ing && ing.name)
        .map((ing) => {
          const stockKey = ing.name.toLowerCase();
          const inStock = stockMap[stockKey] || 0;
          const neededQuantity = ing.quantity - inStock;

          if (neededQuantity <= 0) {
            return null; // We have enough in stock
          }

          return {
            ...ing,
            quantity: neededQuantity,
            checked: false,
          };
        })
        .filter((item): item is ShoppingListItem => item !== null);

      if (shoppingItems.length === 0) {
        Alert.alert(
          'Info',
          `Tous les ingrédients sont déjà en stock pour les plats du ${displayDate}`
        );
        setGenerating(false);
        return;
      }

      // Enhance shopping list items with images from ingredient metadata
      const enhancedItems = await Promise.all(
        shoppingItems.map(async (item) => {
          try {
            // Try to find an image for this ingredient
            const ingredientMeta = await firestore()
              .collection('ingredients')
              .where('nameLower', '==', item.name.toLowerCase())
              .limit(1)
              .get();

            if (!ingredientMeta.empty) {
              const metaData = ingredientMeta.docs[0].data();
              if (metaData.imageUrls && metaData.imageUrls.length > 0) {
                return {
                  ...item,
                  imageUrl: metaData.imageUrls[0],
                };
              }
            }
            return item;
          } catch (e) {
            console.error('Error enhancing ingredient with image:', e);
            return item;
          }
        })
      );

      // Create a new shopping list in Firestore
      const listRef = await firestore()
        .collection('users')
        .doc(userId)
        .collection('shoppingLists')
        .add({
          name: `Liste du ${displayDate}`,
          date: dateKey,
          items: enhancedItems,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastModified: firestore.FieldValue.serverTimestamp(),
        });

      // Navigate to the newly created list
      navigation.navigate('ShoppingListDetail', {
        listId: listRef.id,
      });
    } catch (error) {
      console.error('Error generating shopping list:', error);
      Alert.alert('Erreur', 'Impossible de générer la liste de courses');
    } finally {
      setGenerating(false);
    }
  };

  const renderShoppingList = ({ item }: { item: ShoppingList }) => {
    // Convert Firestore timestamp to JS Date if exists
    let displayDate = item.date;
    
    if (item.createdAt && typeof item.createdAt.toDate === 'function') {
      const date = item.createdAt.toDate();
      displayDate = formatDateForDisplay(date);
    }

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => navigation.navigate('ShoppingListDetail', { listId: item.id })}
      >
        <Icon name="format-list-checks" size={24} color="#f57c00" style={styles.listIcon} />
        <View style={styles.listContent}>
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listDate}>{displayDate}</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#aaa" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2d5a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {lists.length > 0 ? (
        <FlatList
          data={lists}
          renderItem={renderShoppingList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="cart-outline" size={70} color="#f57c00" />
          <Text style={styles.emptyText}>
            Vous n'avez pas encore de listes de courses
          </Text>
          <Text style={styles.emptySubText}>
            Appuyez sur le bouton '+' pour en créer une
          </Text>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        color="#fff"
        onPress={showDatePickerModal}
        disabled={generating}
        loading={generating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2d5a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2d5a',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a2d5a',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
    color: '#f57c00',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  listItem: {
    backgroundColor: '#1a2d5a',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f57c00',
    borderWidth: 1,
    borderColor: '#2a3d6a',
  },
  listIcon: {
    marginRight: 14,
  },
  listContent: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f57c00',
  },
  listDate: {
    fontSize: 13,
    color: '#fff',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#f57c00',
  },
});

export default ShoppingListsScreen;
