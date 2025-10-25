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
import { COLORS } from '../constants/colors';

// Use shared theme colors

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
  const [listTitle, setListTitle] = useState('Shopping List');
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [adding, setAdding] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: listTitle,
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
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
          color={COLORS.accent}
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
        <ActivityIndicator size="large" color={COLORS.accent} />
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
            <Icon name="cart-outline" size={60} color={COLORS.gray} />
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
          placeholderTextColor={COLORS.lightGray}
        />
        <TextInput
          style={styles.quantityInput}
          placeholder="Qté"
          keyboardType="numeric"
          value={newItemQty}
          onChangeText={setNewItemQty}
          placeholderTextColor={COLORS.lightGray}
        />
        
        <TouchableOpacity
          style={[styles.addButton, (!newItemName.trim() || adding) && styles.disabledButton, { backgroundColor: COLORS.accent }]}
          onPress={addItem}
          disabled={!newItemName.trim() || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Icon name="plus" size={24} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hintText}> Appui long sur un article pour le supprimer</Text>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.lightGray,
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
    color: COLORS.gray,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.lightGray,
    marginTop: 10,
  },
  addContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.primary,
    borderTopWidth: 1,
    borderTopColor: COLORS.primaryDark,
  },
  nameInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryDark,
    marginRight: 8,
    color: COLORS.white,
  },
  quantityInput: {
    width: 60,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryDark,
    marginRight: 8,
    textAlign: 'center',
    color: COLORS.white,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
  hintText: {
    textAlign: 'center',
    color: COLORS.lightGray,
    fontSize: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
  },
});

export default ShoppingListDetailScreen;
