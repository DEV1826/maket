/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Platform,
  Dimensions,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  RecipeDetail: { recipe: {
    id: string;
    name: string;
    image: string;
    ingredients: Array<{
      name: string;
      quantity: string;
      unit: string;
    }>;
    instructions: string;
  } };
  ShoppingList: { list: ShoppingList };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
import { ShoppingListActions } from './src/components/ShoppingListActions';
import { ShoppingList } from './src/types/shoppingList';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { RecipeCard } from './src/components/RecipeCard';

const Stack = createNativeStackNavigator();

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

function HomeScreen() {
  const handleDeleteList = () => {
    // Logique de suppression de la liste
    console.log('Suppression de la liste');
  };

  const mockRecipes = [
    {
      id: '1',
      name: 'Lasagnes à la bolognaise',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
      ingredients: [
        { name: 'Pâtes à lasagne', quantity: '500', unit: 'g' },
        { name: 'Bœuf haché', quantity: '500', unit: 'g' },
        { name: 'Tomates concassées', quantity: '800', unit: 'g' },
        { name: 'Oignon', quantity: '1', unit: 'unité' },
        { name: 'Lait', quantity: '500', unit: 'ml' },
        { name: 'Farine', quantity: '50', unit: 'g' },
        { name: 'Fromage râpé', quantity: '200', unit: 'g' }
      ],
      instructions: 'Préparer la sauce bolognaise, faire la béchamel, assembler les lasagnes et cuire au four.'
    },
    {
      id: '2',
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

  return (
    <View style={styles.container}>
      <ShoppingListActions list={mockShoppingList} onDelete={handleDeleteList} />
      
      <Text style={styles.title}>Mes recettes</Text>
      
      {mockRecipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </View>
  );
}

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? '#fff' : '#000',
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? '#ccc' : '#666',
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
  };

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        <Stack.Screen name="ShoppingList" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
