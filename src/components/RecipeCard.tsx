import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShoppingListActions } from './ShoppingListActions';

interface RecipeCardProps {
  recipe: {
    id: string;
    name: string;
    image: string;
    ingredients: Array<{
      name: string;
      quantity: string;
      unit: string;
    }>;
    instructions: string;
  };
  onGenerateList?: () => void;
  list?: {
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
  } | null;
  onDeleteList?: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onGenerateList, list, onDeleteList }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('RecipeDetail', { recipe });
  };

  const handleGenerate = () => {
    if (onGenerateList) {
      onGenerateList();
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handlePress}>
        <Image
          source={{ uri: recipe.image }}
          style={styles.image}
        />
        <View style={styles.content}>
          <Text style={styles.title}>{recipe.name}</Text>
          <Text style={styles.description}>
            {recipe.ingredients.length} ingrédients
          </Text>
        </View>
      </TouchableOpacity>
      
      {onGenerateList && (
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={handleGenerate}
        >
          <Text style={styles.buttonText}>Générer la liste</Text>
        </TouchableOpacity>
      )}

      {list && onDeleteList && (
        <View style={styles.actionContainer}>
          <ShoppingListActions 
            list={list} 
            onDelete={onDeleteList} 
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 4,
  },
  content: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginRight: -8,
  },
});
