import React from 'react';
import { View, StyleSheet, TouchableOpacity, Share, Alert, Animated, Easing, Text } from 'react-native';
import { ShoppingList } from '../types/shoppingList';
import { COLORS } from '../constants/colors';

interface ShoppingListActionsProps {
  list: ShoppingList;
  onDelete: () => void;
}

export const ShoppingListActions: React.FC<ShoppingListActionsProps> = ({ list, onDelete }) => {
  // Animation states
  const shareButtonAnim = new Animated.Value(0);
  const deleteButtonAnim = new Animated.Value(0);

  const handleShare = async () => {
    try {
      Animated.timing(shareButtonAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      const shareContent = {
        title: list.name,
        message: `Voici ma liste de marché: ${list.name}\n\n${list.items
          .map(item => `${item.name} (${item.quantity})`)
          .join('\n')}`,
      };

      await Share.share(shareContent);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager la liste');
    } finally {
      Animated.timing(shareButtonAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  };

  const handleDelete = () => {
    Animated.timing(deleteButtonAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    Alert.alert(
      'Supprimer la liste',
      'Êtes-vous sûr de vouloir supprimer cette liste ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => {
            Animated.timing(deleteButtonAnim, {
              toValue: 0,
              duration: 200,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }).start();
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete();
            Animated.timing(deleteButtonAnim, {
              toValue: 0,
              duration: 200,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }).start();
          },
        },
      ]
    );
  };

  const shareButtonScale = shareButtonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const deleteButtonScale = deleteButtonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <View style={styles.actionsContainer}>
      <Animated.View style={{ transform: [{ scale: shareButtonScale }] }}>
        <TouchableOpacity 
          onPress={handleShare} 
          style={styles.actionButton}
        >
          <Text style={[styles.icon, { color: COLORS.accent }]}>
            📤
          </Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: deleteButtonScale }] }}>
        <TouchableOpacity 
          onPress={handleDelete} 
          style={styles.actionButton}
        >
          <Text style={[styles.icon, { color: COLORS.error }]}>
            ❌
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 0,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginHorizontal: 4,
  },
  icon: {
    fontSize: 24,
    textAlign: 'center',
  },
});


