import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShoppingListService } from '../services/shoppingListService';
import { ShoppingList } from '../types/shoppingList';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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

type RecipeDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const recipe = route.params.recipe;

  const handleGenerateShoppingList = () => {
    const shoppingList = ShoppingListService.generateFromRecipe(recipe);
    // Ici, vous pouvez sauvegarder la liste dans Firebase ou autre
    console.log('Liste de marché générée:', shoppingList);
    navigation.navigate('ShoppingList', { list: shoppingList });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{recipe.name}</Text>
      
      <Text style={styles.sectionTitle}>Ingrédients</Text>
      {recipe.ingredients.map((ingredient, index) => (
        <View key={index} style={styles.ingredient}>
          <Text>{ingredient.name}</Text>
          <Text>{`${ingredient.quantity} ${ingredient.unit}`}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Instructions</Text>
      <Text style={styles.instructions}>{recipe.instructions}</Text>

      <TouchableOpacity 
        style={styles.generateButton}
        onPress={handleGenerateShoppingList}
      >
        <Text style={styles.buttonText}>Générer la liste de marché</Text>
      </TouchableOpacity>
    </View>
  );
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  ingredient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  instructions: {
    marginTop: 16,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
