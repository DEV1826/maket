import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('RecipeDetail', { recipe });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
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
});
