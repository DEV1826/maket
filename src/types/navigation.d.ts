import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Définissez ici les paramètres pour chaque écran de votre Stack Navigator
export type RootStackParamList = {
  Splash: undefined; // L'écran de démarrage n'a pas de paramètres
  Home: undefined; // L'écran Home n'a pas de paramètres
  Auth: undefined; // L'écran d'authentification n'a pas de paramètres
  Main: undefined; // Si 'Main' est un écran qui ne prend pas de params ou un conteneur de tab/drawer
  PlatsList: undefined; // L'écran de liste des plats n'a pas de paramètres
  AddPlat: { platId?: string, imageUrl?: string }; // AddPlat peut prendre un ID et une URL d'image pour la modification
  PlatDetail: { platId: string }; // PlatDetail nécessite un ID de plat
  Moi: undefined;
  Historique: undefined;
  Foyer: undefined;
  Stock: undefined;
  ShoppingListGenerator: undefined;
  ShoppingLists: undefined; // Écran listant toutes les listes de l'utilisateur
  MealPlanner: undefined; // Nouvelle page pour le planificateur de repas
  BudgetManagement: undefined; // Nouvelle page pour la gestion du budget
  NearbyMarkets: undefined; // Nouvelle page pour localiser les marchés à proximité
  AIAssistant: undefined; // Nouvelle page pour l'assistant cuisine IA
  Chat: undefined; // Chat screen for AI culinary assistant

  ShoppingListDetail: { date?: string; items?: any[]; listId?: string };
  // Signature d'index pour permettre d'autres écrans ou des paramètres plus complexes.
  // C'est essentiel pour satisfaire la contrainte 'ParamListBase'.
  [key: string]: object | undefined;
};

// Types de navigation spécifiques pour certains écrans si nécessaire
// export type PlatsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlatsList'>;
// export type AddPlatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddPlat'>;

// Si vous avez un BottomTabNavigator ou DrawerNavigator, vous pourriez les définir ici aussi
// Exemple pour des onglets (si vous en aviez un):
/*
export type BottomTabParamList = {
  TabHome: undefined;
  TabPlats: undefined;
  TabProfile: undefined;
};

export type BottomTabNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'Main'>,
  BottomTabNavigationProp<BottomTabParamList>
>;
*/

// Définition globale pour React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}