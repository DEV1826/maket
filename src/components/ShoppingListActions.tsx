import React from 'react';
import { View, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ShoppingList } from '../types/shoppingList';

interface ShoppingListActionsProps {
  list: ShoppingList;
  onDelete: () => void;
}

export const ShoppingListActions: React.FC<ShoppingListActionsProps> = ({ list, onDelete }) => {
  const handleShare = async () => {
    try {
      const shareContent = {
        title: list.name,
        message: `Voici ma liste de marché: ${list.name}\n\n${list.items
          .map(item => `${item.name} (${item.quantity})`)
          .join('\n')}`,
      };
      await Share.share(shareContent);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager la liste');
    }
  };

  const handleDelete = () => {
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
          onPress: onDelete,
        },
      ]
    );
  };

  return (
    <View style={styles.actionsContainer}>
      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <Icon name="share" size={24} color="#4CAF50" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
        <Icon name="delete" size={24} color="#f44336" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 8,
  },
  actionButton: {
    marginHorizontal: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
});
