import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const PRIMARY_COLOR = '#1a2d5a';
const ACCENT_COLOR = '#f57c00';

interface ShoppingListItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  imageUrl?: string;
  checked: boolean;
}

type ShoppingListDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ShoppingListDetail'
>;

const ShoppingListDetailScreen: React.FC = () => {
  const navigation = useNavigation<ShoppingListDetailScreenNavigationProp>();
  const route = useRoute();
  const { listId } = route.params as { listId: string };

  const [loading, setLoading] = useState(true);
  const [listTitle, setListTitle] = useState('Liste de courses');
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [adding, setAdding] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: listTitle,
      headerStyle: { backgroundColor: PRIMARY_COLOR },
      headerTintColor: '#fff',
    });
  }, [navigation, listTitle]);

  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }

    const userId = auth().currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Subscribe to the shopping list document
    const unsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .collection('shoppingLists')
      .doc(listId)
      .onSnapshot(
        (doc) => {
          if (doc.exists()) {
            const data = doc.data() || {};
            setItems(data.items || []);
            setListTitle(data.name || 'Liste de courses');
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error loading shopping list:', error);
          Alert.alert('Erreur', 'Impossible de charger la liste de courses');
          setLoading(false);
        }
      );

    return unsubscribe;
  }, [listId]);

  const toggleItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems[index].checked = !updatedItems[index].checked;
    setItems(updatedItems);
    saveChanges(updatedItems);
  };

  const removeItem = (index: number) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous supprimer cet article de la liste?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const updatedItems = [...items];
            updatedItems.splice(index, 1);
            setItems(updatedItems);
            saveChanges(updatedItems);
          },
        },
      ]
    );
  };

  const addItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom de l\'article');
      return;
    }

    setAdding(true);
    
    try {
      const quantity = parseFloat(newItemQty) || 1;
      
      const newItem: ShoppingListItem = {
        id: Math.random().toString(36).substring(2, 10),
        name: newItemName.trim(),
        quantity: quantity,
        unit: '',
        checked: false,
      };
      
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      saveChanges(updatedItems);
      
      // Reset input fields
      setNewItemName('');
      setNewItemQty('1');
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'article');
    } finally {
      setAdding(false);
    }
  };

  const saveChanges = async (updatedItems: ShoppingListItem[]) => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId || !listId) return;

      await firestore()
        .collection('users')
        .doc(userId)
        .collection('shoppingLists')
        .doc(listId)
        .update({
          items: updatedItems,
          lastModified: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    }
  };

  const renderItem = ({ item, index }: { item: ShoppingListItem; index: number }) => {
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => toggleItem(index)}
        onLongPress={() => removeItem(index)}
      >
        <Icon
          name={item.checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={ACCENT_COLOR}
          style={styles.checkbox}
        />
        
        <View style={styles.itemContent}>
          <Text style={[styles.itemName, item.checked && styles.checkedText]}>
            {item.name}
          </Text>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.unit}
          </Text>
        </View>
        
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
            defaultSource={require('../../assets/images/slider/carotte_2.jpg')}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cart-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>La liste est vide</Text>
          </View>
        }
      />

      <View style={styles.addContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="Nom de l'article"
          value={newItemName}
          onChangeText={setNewItemName}
        />
        
        <TextInput
          style={styles.quantityInput}
          placeholder="Qté"
          keyboardType="numeric"
          value={newItemQty}
          onChangeText={setNewItemQty}
        />
        
        <TouchableOpacity
          style={[styles.addButton, (!newItemName.trim() || adding) && styles.disabledButton]}
          onPress={addItem}
          disabled={!newItemName.trim() || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="plus" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hintText}>
        Appui long sur un article pour le supprimer
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginLeft: 8,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  addContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nameInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR + '40',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginRight: 8,
    color: PRIMARY_COLOR,
  },
  quantityInput: {
    width: 60,
    height: 48,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR + '40',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginRight: 8,
    textAlign: 'center',
    color: PRIMARY_COLOR,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: ACCENT_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  hintText: {
    textAlign: 'center',
    color: PRIMARY_COLOR,
    fontSize: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
});

export default ShoppingListDetailScreen;
