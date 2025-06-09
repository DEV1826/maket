import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShoppingList } from '../types/shoppingList';

interface ShoppingListsScreenProps {
  route: any;
}

const ShoppingListsScreen: React.FC<ShoppingListsScreenProps> = ({ route }) => {
  const navigation = useNavigation();

  // TODO: Replace with actual data from your state management
  const shoppingLists: ShoppingList[] = [
    {
      id: '1',
      name: 'Liste du week-end',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Liste du mardi',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
  ];

  const handleListPress = (listId: string) => {
    navigation.navigate('ShoppingListDetail', { listId });
  };

  return (
    <FlatList
      style={styles.container}
      data={shoppingLists}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => handleListPress(item.id)}
        >
          <Text style={styles.listName}>{item.name}</Text>
          <Text style={styles.listDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.contentContainer}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
  },
  listDate: {
    fontSize: 14,
    color: '#666',
  },
});

export default ShoppingListsScreen;
