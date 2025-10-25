import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // Si vous utilisez des onglets
import Icon from 'react-native-vector-icons/Ionicons';
import StockScreen from './screens/StockScreen';
import ShoppingListDetailScreen from './screens/ShoppingListDetailScreen';
import { COLORS } from './constants/colors';


// Importez vos écrans
import SplashScreen from './screens/SplashScreen'; // Nouvel écran de démarrage
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import MoiScreen from './screens/Moi';
import MealHistoryScreen from './screens/MealHistoryScreen';
import PlatsListScreen from './screens/PlatsListScreen';
import AddPlatScreen from './screens/AddPlatScreen';
import FoyerScreen from './screens/FoyerScreen';
import PlatDetailScreen from './screens/PlatDetailScreen';
import ShoppingListsScreen from './screens/ShoppingListsScreen';
import MealPlannerScreen from './screens/MealPlannerScreen';
import BudgetManagementScreen from './screens/BudgetManagementScreen';
import NearbyMarketsScreen from './screens/NearbyMarketsScreen';
import AIAssistantScreen from './screens/AIAssistantScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
// const Tab = createBottomTabNavigator(); // Si vous utilisez des onglets

// Exemple de Stack Navigator
const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator initialRouteName="Splash">
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Moi" component={MoiScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Historique" component={MealHistoryScreen} options={{ title: 'Historique des Repas', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white }} />
      <Stack.Screen name="PlatsList" component={PlatsListScreen} options={{ 
        title: 'Mes Plats',
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.white,
        },
      }} />

      <Stack.Screen name="AddPlat" component={AddPlatScreen} options={({route }) => ({
        title: route.params?.platId ? 'Modifier le Plat' : 'Ajouter un Plat',
      })} />

      {/* --- VOICI LA CORRECTION POUR L'ÉCRAN "FOYER" --- */}
      <Stack.Screen name="Foyer" component={FoyerScreen} options={{ title: 'Mon Foyer', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white }} />
      {/* --- AJOUT DE L'ÉCRAN "STOCK" POUR COMPLÉTUDE --- */}
      <Stack.Screen
        name="Stock"
        component={StockScreen}
        options={{
          title: 'Mon Stock',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.white,
        }}
        />

      <Stack.Screen name="PlatDetail" component={PlatDetailScreen} options={{ title: 'Détails du Plat', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white }} />
      {/* Ajoutez vos autres écrans ici */}
      <Stack.Screen name="ShoppingLists" component={ShoppingListsScreen} options={({ navigation }) => ({
        title: 'Mes Listes de Courses',
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
          color: COLORS.white,
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('NearbyMarkets')}
            style={{
              backgroundColor: COLORS.accent,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Icon name="map-marker" size={18} color="#fff" />
            <Text style={{ color: COLORS.white, marginLeft: 4, fontSize: 14, fontWeight: '600' }}>
              Marchés
            </Text>
          </TouchableOpacity>
        ),
      })} />
      <Stack.Screen name="ShoppingListDetail" component={ShoppingListDetailScreen} options={({route }) => ({
        title: route.params?.listId ? 'Liste de Courses' : 'Détail Liste', // Le titre sera mis à jour dynamiquement dans l'écran
      })} />
      {/* Vous pouvez retirer ShoppingListGenerator si vous n'en avez plus besoin, ou le laisser pour une future implémentation de génération auto */}
      <Stack.Screen name="MealPlanner" component={MealPlannerScreen} options={{ title: 'Planificateur de Repas', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white }} />
      <Stack.Screen name="BudgetManagement" component={BudgetManagementScreen} options={{ title: 'Gestion du Budget', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: COLORS.white }} />
      <Stack.Screen name="NearbyMarkets" component={NearbyMarketsScreen} options={{ title: 'Marchés à Proximité', headerShown: false }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ title: 'Assistant Cuisine IA', headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
       {/* ... */}

      
    </Stack.Navigator>
  );
};

export default AppNavigator;