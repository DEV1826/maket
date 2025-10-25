/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Types
interface ShoppingList {
  id: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    quantity: string;
    purchased: boolean;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface Recipe {
  id: string;
  name: string;
  image: string;
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;
  instructions: string;
}

type RootStackParamList = {
  Home: undefined;
  RecipeDetail: { recipe: Recipe };
  ShoppingList: { list: ShoppingList };
};

// Navigation
const Stack = createNativeStackNavigator<RootStackParamList>();

// Components
import { ShoppingListActions } from './src/components/ShoppingListActions';
import { RecipeCard } from './src/components/RecipeCard';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  itemsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemQuantity: {
    fontSize: 16,
    color: '#666',
  },
});

// Mock data
const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Pizza Margherita',
    image: 'https://via.placeholder.com/150',
    ingredients: [
      { name: 'Farine', quantity: '500', unit: 'g' },
      { name: 'Eau', quantity: '300', unit: 'ml' },
      { name: 'Lait', quantity: '1', unit: 'litre' },
      { name: 'Sucre', quantity: '1', unit: 'cuillère à soupe' },
      { name: 'Sel', quantity: '1', unit: 'pincée' },
    ],
    instructions: 'Instructions détaillées pour la pizza margherita',
  },
  {
    id: '2',
    name: 'Lasagnes',
    image: 'https://via.placeholder.com/150',
    ingredients: [
      { name: 'Pâtes à lasagne', quantity: '500', unit: 'g' },
      { name: 'Bœuf haché', quantity: '500', unit: 'g' },
      { name: 'Sauce tomate', quantity: '1', unit: 'litre' },
      { name: 'Fromage râpé', quantity: '200', unit: 'g' },
    ],
    instructions: 'Instructions détaillées pour les lasagnes',
  },
  {
    id: '3',
    name: 'Salade César',
    image: 'https://images.unsplash.com/photo-1563320566-4132a7286e50',
    ingredients: [
      { name: 'Laitue romaine', quantity: '1', unit: 'pièce' },
      { name: 'Poulet', quantity: '300', unit: 'g' },
      { name: 'Pain', quantity: '100', unit: 'g' },
      { name: 'Parmesan', quantity: '50', unit: 'g' },
      { name: 'Huile d\'olive', quantity: '50', unit: 'ml' },
      { name: 'Citron', quantity: '1', unit: 'pièce' },
      { name: 'Anchois', quantity: '5', unit: 'pièces' }
    ],
    instructions: 'Préparer le poulet grillé, faire la vinaigrette, assembler la salade.'
  }
];

const mockShoppingList: ShoppingList = {
  id: '1',
  name: 'Ma liste de marché',
  items: [
    { id: '1', name: 'Pommes', quantity: '5', purchased: false, notes: '', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', name: 'Lait', quantity: '1L', purchased: false, notes: '', createdAt: new Date(), updatedAt: new Date() },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Components
function HomeScreen() {
  const [shoppingList, setShoppingList] = React.useState<ShoppingList | null>(null);
  const [recipes, setRecipes] = React.useState<Recipe[]>(mockRecipes);

  const handleGenerateList = (recipe: Recipe) => {
    const list: ShoppingList = {
      id: Date.now().toString(),
      name: `Liste pour ${recipe.name}`,
      items: recipe.ingredients.map((ingredient, index) => ({
        id: `${recipe.id}-${index}`,
        name: ingredient.name,
        quantity: ingredient.quantity,
        purchased: false,
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setShoppingList(list);
  };

  const handleDeleteList = () => {
    Alert.alert(
      'Supprimer la liste',
      'Êtes-vous sûr de vouloir supprimer cette liste ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setShoppingList(null),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liste de marché</Text>
      
      {shoppingList ? (
        <View style={styles.itemsContainer}>
          <View style={styles.listItem}>
            <View style={styles.listHeader}>
              <Text style={styles.listName}>{shoppingList.name}</Text>
              <ShoppingListActions 
                list={shoppingList} 
                onDelete={handleDeleteList} 
              />
            </View>
            {shoppingList.items.map((item, index) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text>Pas de liste de marché</Text>
      )}

      <FlatList
        data={recipes}
        renderItem={({ item }) => (
          <RecipeCard
            key={item.id}
            recipe={item}
            onGenerateList={() => handleGenerateList(item)}
            list={shoppingList}
            onDeleteList={handleDeleteList}
          />
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
