import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

import { RootStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');

// Format date as YYYY-MM-DD for consistency
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface WeeklyMeal {
  id: string;
  day: string;
  dayNum: number;
  date: string;
  name: string;
  image?: any;
  ingredients?: string[];
  dishId?: string; // ID reference to the dish in plats collection
  dishIds?: string[]; // Array of dish IDs for shopping list generation
}

interface InventoryItem {
  id: string;
  nom: string;
  quantite: number;
  unite: string;
  categorie: string;
  status?: string;
  datePeremption?: any; // Firestore Timestamp
  priority?: number; // For sorting items by urgency
}

const defaultWeeklyMeals: WeeklyMeal[] = [
  { id: '1', day: 'Lun', dayNum: new Date().getDate(), date: new Date().getDate() + '/' + (new Date().getMonth() + 1), name: 'Chicken Salad', image: require('../../assets/images/slider/crevette_2.jpg') },
  { id: '2', day: 'Mar', dayNum: new Date().getDate() + 1, date: (new Date().getDate() + 1) + '/' + (new Date().getMonth() + 1), name: 'Pasta', image: require('../../assets/images/slider/carotte_2.jpg') },
  { id: '3', day: 'Mer', dayNum: new Date().getDate() + 2, date: (new Date().getDate() + 2) + '/' + (new Date().getMonth() + 1), name: 'Steak', image: require('../../assets/images/slider/bœuf_1.jpg') },
  { id: '4', day: 'Jeu', dayNum: new Date().getDate() + 3, date: (new Date().getDate() + 3) + '/' + (new Date().getMonth() + 1), name: 'Fish', image: require('../../assets/images/slider/eau_3.jpg') },
  { id: '5', day: 'Ven', dayNum: new Date().getDate() + 4, date: (new Date().getDate() + 4) + '/' + (new Date().getMonth() + 1), name: 'Pizza', image: require('../../assets/images/slider/crevette_2.jpg') },
  { id: '6', day: 'Sam', dayNum: new Date().getDate() + 5, date: (new Date().getDate() + 5) + '/' + (new Date().getMonth() + 1), name: 'Risotto', image: require('../../assets/images/slider/carotte_2.jpg') },
  { id: '7', day: 'Dim', dayNum: new Date().getDate() + 6, date: (new Date().getDate() + 6) + '/' + (new Date().getMonth() + 1), name: 'Roast', image: require('../../assets/images/slider/bœuf_1.jpg') },
];

const HomeScreen: React.FC = () => {
  // Set status bar color to match app theme
  useEffect(() => {
    StatusBar.setBackgroundColor('#1a2d5a');
    StatusBar.setBarStyle('light-content');
  }, []);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeal[]>(defaultWeeklyMeals);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingMeals, setRefreshingMeals] = useState(false);
  const slideRef = useRef<FlatList>(null);
  const [sliderImages, setSliderImages] = useState<any[]>([
    require('../../assets/images/intrance.png'),
    require('../../assets/images/slider/bœuf_1.jpg'),
    require('../../assets/images/slider/carotte_2.jpg'),
    require('../../assets/images/slider/crevette_2.jpg'),
    require('../../assets/images/slider/eau_3.jpg'),
  ]);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      const nextIndex = (currentSlideIndex + 1) % sliderImages.length;
      setCurrentSlideIndex(nextIndex);
      slideRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 19000); // Changed to 19 seconds

    return () => clearInterval(slideTimer);
  }, [currentSlideIndex]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // Check if user is authenticated
        const userId = auth().currentUser?.uid;
        if (!userId) {
          console.log('User not authenticated, using default inventory (empty)');
          setLoading(false);
          return;
        }

        // Try to fetch from Firestore
        try {
          // First try to get from stock collection (preferred)
          const stockSnapshot = await firestore()
            .collection('users')
            .doc(userId)
            .collection('stock')
            .get();

          if (!stockSnapshot.empty) {
            const now = new Date();
            const items = stockSnapshot.docs.map(doc => {
              const data = doc.data();
              // Calculate priority based on expiry date and quantity
              let priority = 0;
              
              // Check expiry date - higher priority for items expiring soon
              if (data.datePeremption) {
                const expiryDate = data.datePeremption.toDate();
                const daysToExpiry = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                
                if (daysToExpiry <= 3) priority += 100; // Expiring in 3 days or less
                else if (daysToExpiry <= 7) priority += 50; // Expiring in a week
                else if (daysToExpiry <= 14) priority += 25; // Expiring in two weeks
              }
              
              // Check quantity - higher priority for low quantity items
              const quantity = parseFloat(data.quantite) || 0;
              if (quantity <= 1) priority += 75; // Very low quantity
              else if (quantity <= 3) priority += 40; // Low quantity
              
              // Generate status message
              let status = '';
              if (data.datePeremption) {
                const expiryDate = data.datePeremption.toDate();
                const daysToExpiry = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                
                if (daysToExpiry <= 3) {
                  status = `${data.nom} expires in ${daysToExpiry} day${daysToExpiry !== 1 ? 's' : ''}`;
                } else if (quantity <= 1) {
                  status = `Running low on ${data.nom.toLowerCase()}`;
                } else {
                  status = `${data.nom} (${quantity} ${data.unite})`;
                }
              } else if (quantity <= 1) {
                status = `Running low on ${data.nom.toLowerCase()}`;
              } else {
                status = `${data.nom} (${quantity} ${data.unite})`;
              }
              
              return {
                id: doc.id,
                nom: data.nom,
                quantite: parseFloat(data.quantite) || 0,
                unite: data.unite,
                categorie: data.categorie || 'General',
                datePeremption: data.datePeremption,
                status,
                priority
              };
            });
            
            // Sort by priority (highest first)
            items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            setInventoryItems(items);
          } else {
            // Fallback to inventory collection if stock is empty
            const inventorySnapshot = await firestore()
              .collection('users')
              .doc(userId)
              .collection('inventory')
              .get();

            if (!inventorySnapshot.empty) {
              const items = inventorySnapshot.docs.map(doc => {
                const data = doc.data();
                let status = '';
                if (data.quantite <= 1) status = 'Running low on ' + data.nom.toLowerCase();
                else status = 'Plenty of ' + data.nom.toLowerCase();
                
                return {
                  id: doc.id,
                  ...data,
                  status,
                  priority: data.quantite <= 1 ? 75 : 0
                };
              }) as InventoryItem[];
              
              // Sort by priority (highest first)
              items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
              setInventoryItems(items);
            }
          }
        } catch (firestoreError) {
          console.error('Firestore access error:', firestoreError);
          console.log('Firestore access denied for inventory, using default (empty)');
          // Just continue with empty inventory
        }
      } catch (error) {
        console.error('Error in inventory logic:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  useEffect(() => {

    const fetchWeeklyMeals = async () => {
      try {
        // Check if user is authenticated
        const userId = auth().currentUser?.uid;
        if (!userId) {
          console.log('User not authenticated, using default weekly meals');
          return; // Keep using default meals
        }

        // Try to fetch from Firestore - first check if we have a weekly plan for today
        try {
          const today = new Date();
          const dateKey = formatDateKey(today);
          
          // Try to get the meal plan for today's date
          const todayMealPlan = await firestore()
            .collection('users')
            .doc(userId)
            .collection('weeklyMeals')
            .doc(dateKey)
            .get();

          if (todayMealPlan.exists()) {
            // We have a meal plan for today, load the whole week
            const weeklyMealsArray: WeeklyMeal[] = [];
            const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
            
            // Load 7 days starting from today
            for (let i = 0; i < 7; i++) {
              const date = new Date(today);
              date.setDate(today.getDate() + i);
              const dayKey = formatDateKey(date);
              
              const mealDoc = await firestore()
                .collection('users')
                .doc(userId)
                .collection('weeklyMeals')
                .doc(dayKey)
                .get();
              
              if (mealDoc.exists()) {
                const mealData = mealDoc.data();
                if (mealData) {
                  weeklyMealsArray.push({
                    id: dayKey,
                    day: days[date.getDay()],
                    dayNum: date.getDate(),
                    date: `${date.getDate()}/${date.getMonth() + 1}`,
                    name: mealData.name || 'Plat du jour',
                    image: mealData.image || require('../../assets/images/slider/carotte_2.jpg'),
                    ingredients: mealData.ingredients || [],
                    dishId: mealData.dishId // Store the reference to the actual dish
                  });
                }
              } else {
                // No meal for this day, use a placeholder
                weeklyMealsArray.push({
                  id: dayKey,
                  day: days[date.getDay()],
                  dayNum: date.getDate(),
                  date: `${date.getDate()}/${date.getMonth() + 1}`,
                  name: 'Pas de plat prévu',
                  image: require('../../assets/images/slider/carotte_2.jpg'),
                  ingredients: []
                });
              }
            }
            
            setWeeklyMeals(weeklyMealsArray);
          } else {
            // No meal plan for today, we need to generate one
            console.log('No meal plan for today, will generate one');
            // We'll call fetchUserDishesForMealPlan to generate and save a new plan
            await fetchUserDishesForMealPlan();
          }
        } catch (firestoreError) {
          console.log('Firestore access error:', firestoreError);
          // Keep using default meals, no need to throw error
        }
      } catch (error) {
        console.error('Error in weekly meals logic:', error);
        // Fallback to default meals
      }
    };

    fetchWeeklyMeals();
  }, []);

  const fetchUserDishesForMealPlan = async () => {
    setRefreshingMeals(true);
    
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        console.log('User not authenticated');
        setRefreshingMeals(false);
        return;
      }
      
      // Fetch user's dishes from their plats collection
      const userDishesSnapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('plats')
        .limit(20) // Increased to have more variety
        .get();
      
      if (!userDishesSnapshot.empty) {
        // Get user dishes
        const userDishes = userDishesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${userDishes.length} user dishes`);
        
        // Create weekly meal plan with user's dishes
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const today = new Date();
        const updatedMeals: WeeklyMeal[] = [];
        
        // Create meal plan for 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayName = days[date.getDay()];
          const dayNum = date.getDate();
          const monthNum = date.getMonth() + 1;
          const dateStr = `${dayNum}/${monthNum}`;
          const dateKey = formatDateKey(date);
          
          // Pick a random dish from user's collection
          const dishIndex = Math.floor(Math.random() * userDishes.length);
          const dish: any = userDishes[dishIndex];
          
          // Create the meal object
          const meal = {
            id: dateKey, // Use date as ID for consistency
            day: dayName,
            dayNum,
            date: dateStr,
            name: dish.nom || 'Plat du jour',
            image: dish.imageUrl ? { uri: dish.imageUrl } : require('../../assets/images/slider/carotte_2.jpg'),
            ingredients: dish.ingredients?.map((ing: any) => ing.nom) || [],
            dishId: dish.id // Store the reference to the actual dish
          };
          
          updatedMeals.push(meal);
        }
        
        // Update weekly meals with user's dishes
        setWeeklyMeals(updatedMeals);
        
        // Save to weeklyMeals collection with date-based document IDs
        try {
          const batch = firestore().batch();
          
          // Save each meal with its date as the document ID
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateKey = formatDateKey(date);
            const meal = updatedMeals[i];
            
            // Save the meal plan with the date as document ID
            const mealRef = firestore()
              .collection('users')
              .doc(userId)
              .collection('weeklyMeals')
              .doc(dateKey);
            
            // Also save the dishId for the shopping list generation
            batch.set(mealRef, {
              ...meal,
              dishIds: [meal.dishId], // This is what the shopping list generator expects
              createdAt: firestore.FieldValue.serverTimestamp(),
              lastUpdated: firestore.FieldValue.serverTimestamp()
            });
          }
          
          await batch.commit();
          console.log('Weekly meal plan updated in Firestore with date-based IDs');
        } catch (error) {
          console.error('Error saving weekly meal plan:', error);
        }
      } else {
        console.log('No user dishes found, using default meals');
      }
    } catch (error) {
      console.error('Error fetching user dishes:', error);
    } finally {
      setRefreshingMeals(false);
    }
  };

  const renderSlideItem = ({ item }: { item: any }) => (
    <View style={styles.slideItem}>
      <Image source={item} style={styles.slideImage} resizeMode="cover" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1a2d5a" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.minimalHeader}>
          <Text style={styles.minimalAppName}>MBOA</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Moi')}>
            <Icon name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.sliderContainer}>
          <FlatList
            ref={slideRef}
            data={sliderImages}
            renderItem={renderSlideItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const slideIndex = Math.floor(event.nativeEvent.contentOffset.x / width);
              setCurrentSlideIndex(slideIndex);
            }}
          />
          <View style={styles.paginationContainer}>
            {sliderImages.map((_, index) => (
              <View
                key={index}
                style={[styles.paginationDot, index === currentSlideIndex ? styles.paginationDotActive : null]}
              />
            ))}
          </View>
        </View>
        <View style={styles.curvedDivider} />
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>This Week's Meals</Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={fetchUserDishesForMealPlan}
              disabled={refreshingMeals}
            >
              {refreshingMeals ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="refresh" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealsContainer}>
            {weeklyMeals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={styles.mealCard}
                onPress={() => navigation.navigate('PlatsList')}
              >
                <Image source={meal.image || require('../../assets/images/slider/carotte_2.jpg')} style={styles.mealImage} resizeMode="cover" />
                <View style={styles.mealInfo}>
                  <Text style={styles.mealDay}>{meal.day} {meal.date}</Text>
                  <Text style={styles.mealName}>{meal.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Inventory Snapshot</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#f57c00" />
          ) : inventoryItems.length > 0 ? (
            <View style={styles.inventoryList}>
              {/* Show only the top 2 priority items */}
              {inventoryItems.slice(0, 2).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.inventoryItem, item.priority && item.priority > 50 ? styles.highPriorityItem : null]}
                  onPress={() => navigation.navigate('Stock')}
                >
                  <View style={styles.inventoryIconContainer}>
                    {item.datePeremption && item.priority && item.priority >= 100 ? (
                      <Icon name="alert-circle" size={22} color="#fff" />
                    ) : item.quantite <= 1 ? (
                      <Icon name="remove-circle" size={22} color="#fff" />
                    ) : (
                      <Icon name="nutrition-outline" size={22} color="#fff" />
                    )}
                  </View>
                  <View style={styles.inventoryInfo}>
                    <Text style={styles.inventoryCategory}>{item.nom}</Text>
                    <Text style={styles.inventoryStatus}>{item.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.actionButton, { width: '100%', marginTop: 10 }]}
                onPress={() => navigation.navigate('Stock')}
              >
                <Icon name="list" size={20} color="#f57c00" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>View All Inventory</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyInventory}>
              <Icon name="basket-outline" size={40} color="#f57c00" />
              <Text style={styles.emptyText}>Your inventory is empty</Text>
              <TouchableOpacity
                style={[styles.actionButton, { marginTop: 15, backgroundColor: '#f57c00' }]}
                onPress={() => navigation.navigate('Stock')}
              >
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Add Items</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ShoppingLists')}>
              <Icon name="cart-outline" size={18} color="#f57c00" style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>Add to Shopping List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Stock')}>
              <Icon name="scan-outline" size={18} color="#f57c00" style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>Scan Item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PlatsList')}>
              <Icon name="restaurant-outline" size={18} color="#f57c00" style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>Start Cooking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AIAssistant')}>
              <Icon name="bulb-outline" size={18} color="#f57c00" style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>AI Suggestions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Icon name="home" size={24} color="#fff" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MealPlanner')}>
          <Icon name="calendar" size={24} color="#fff" />
          <Text style={styles.navText}>Recipes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Stock')}>
          <Icon name="cube" size={24} color="#fff" />
          <Text style={styles.navText}>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ShoppingLists')}>
          <Icon name="cart" size={24} color="#fff" />
          <Text style={styles.navText}>Shopping</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('AIAssistant')}>
          <Icon name="star" size={24} color="#fff" />
          <Text style={styles.navText}>Assistant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2d5a',
  },
  contentContainer: {
    paddingBottom: 70,
  },

  minimalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 5,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  minimalAppName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  sliderContainer: {
    height: 350, // Increased height to take about half the screen
    width: '100%',
    marginBottom: 10,
    position: 'relative',
    backgroundColor: '#1a2d5a',
  },
  slideItem: {
    width: width,
    height: 350, // Match the container height
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    opacity: 0.9,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    width: '100%',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  curvedDivider: {
    display: 'none', // Hide the curved divider
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff', // White title on navy background
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  mealsContainer: {
    marginBottom: 10,
  },
  mealCard: {
    width: 110,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 45, 90, 0.7)', // Consistent navy blue background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealImage: {
    width: 110,
    height: 80,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  mealInfo: {
    padding: 10,
  },
  mealDay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f57c00', // Orange day for contrast
  },
  mealName: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  inventoryList: {
    marginTop: 10,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 45, 90, 0.7)', // Consistent navy blue background
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#f57c00', // Orange border for contrast
  },
  highPriorityItem: {
    borderLeftColor: '#ff3d00', // Bright orange-red for high priority items
    backgroundColor: 'rgba(26, 45, 90, 0.85)', // Slightly darker background
  },
  inventoryIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f57c00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff', // White text for contrast
  },
  inventoryStatus: {
    fontSize: 12,
    color: '#f57c00', // Keep orange for status text for contrast
  },
  emptyInventory: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 45, 90, 0.7)', // Consistent navy blue background
    borderRadius: 12,
    padding: 30,
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
  },
  quickActionsContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'rgba(26, 45, 90, 0.7)', // Consistent navy blue background
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#f57c00',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  bottomNavBar: {
    flexDirection: 'row',
    backgroundColor: '#132240',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    height: 65,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#fff', // White text
    fontWeight: '500',
  },
});

export default HomeScreen;