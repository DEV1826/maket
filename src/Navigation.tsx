import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // Si vous utilisez des onglets
import Icon from 'react-native-vector-icons/Ionicons';
import StockScreen from './screens/StockScreen';
import ShoppingListDetailScreen from './screens/ShoppingListDetailScreen';


// Importez vos écrans
import SplashScreen from './screens/SplashScreen'; // Nouvel écran de démarrage
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import MoiScreen from './screens/Moi'; // Renommé de 'Moi' à 'MoiScreen' pour la convention
import HistoriqueScreen from './screens/Historique'; // Renommé de 'Historique'
import PlatsListScreen from './screens/PlatsListScreen';
import AddPlatScreen from './screens/AddPlatScreen';
import FoyerScreen from './screens/FoyerScreen';
import ShoppingListsScreen from './screens/ShoppingListsScreen';
import MealPlannerScreen from './screens/MealPlannerScreen'; // Importez le nouveau fichier
import BudgetManagementScreen from './screens/BudgetManagementScreen'; // Importez le nouveau fichier
import PlatDetailScreen from './screens/PlatDetailScreen'; // Importez le nouveau fichier
import NearbyMarketsScreen from './screens/NearbyMarketsScreen'; // Écran pour les marchés à proximité
import AIAssistantScreen from './screens/AIAssistantScreen'; // Nouvel écran d'assistant IA
import ChatScreen from './screens/ChatScreen'; // AI Chat screen
// Importez vos autres écrans Foyer, Stock, ShoppingListGenerator si vous les avez

// Importez le type de navigation que vous avez défini globalement
import { RootStackParamList } from './types/navigation'; // Chemin corrigé

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
      <Stack.Screen name="Historique" component={HistoriqueScreen} options={{ title: 'Historique des Repas' }} />
      <Stack.Screen name="PlatsList" component={PlatsListScreen} options={{ 
        title: 'Mes Plats',
        headerStyle: {
          backgroundColor: '#1a2f5a', // Navy blue background
        },
        headerTintColor: '#ffffff', // White text and back button
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }} />

      <Stack.Screen name="AddPlat" component={AddPlatScreen} options={({ route }) => ({
        title: route.params?.platId ? 'Modifier le Plat' : 'Ajouter un Plat',
      })} />

      {/* --- VOICI LA CORRECTION POUR L'ÉCRAN "FOYER" --- */}
      <Stack.Screen name="Foyer" component={FoyerScreen} options={{ title: 'Mon Foyer', // Titre statique, pas besoin de route.params
}}
      />
      {/* --- AJOUT DE L'ÉCRAN "STOCK" POUR COMPLÉTUDE --- */}
      <Stack.Screen
        name="Stock"
        component={StockScreen}
        options={{
          title: 'Mon Stock', // Titre statique également
        }}
        />

      <Stack.Screen name="PlatDetail" component={PlatDetailScreen} options={{ title: 'Détails du Plat' }} />
      {/* Ajoutez vos autres écrans ici */}
      <Stack.Screen name="ShoppingLists" component={ShoppingListsScreen} options={({ navigation }) => ({
        title: 'Mes Listes de Courses',
        headerStyle: {
          backgroundColor: '#1a2d5a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
          color: '#fff',
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('NearbyMarkets')}
            style={{
              backgroundColor: '#f57c00',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 8,
            }}
          >
            <Icon name="map-marker" size={18} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 4, fontSize: 14, fontWeight: '600' }}>
              Marchés
            </Text>
          </TouchableOpacity>
        ),
      })} />
      <Stack.Screen name="ShoppingListDetail" component={ShoppingListDetailScreen} options={({ route }) => ({
        title: route.params?.listId ? 'Liste de Courses' : 'Détail Liste', // Le titre sera mis à jour dynamiquement dans l'écran
      })} />
      {/* Vous pouvez retirer ShoppingListGenerator si vous n'en avez plus besoin, ou le laisser pour une future implémentation de génération auto */}
      <Stack.Screen name="MealPlanner" component={MealPlannerScreen} options={{ title: 'Planificateur de Repas' }} />
      <Stack.Screen name="BudgetManagement" component={BudgetManagementScreen} options={{ title: 'Gestion du Budget' }} />
      <Stack.Screen name="NearbyMarkets" component={NearbyMarketsScreen} options={{ title: 'Marchés à Proximité', headerShown: false }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ title: 'Assistant Cuisine IA', headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
       {/* ... */}

      
    </Stack.Navigator>
  );
};

export default AppNavigator;