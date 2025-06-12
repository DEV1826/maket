import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import { RootStackParamList } from '../types/navigation';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const getFormattedDateTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return now.toLocaleDateString('fr-FR', options);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.appName}>Ma Cuisine</Text>
        <View style={styles.dateContainer}>
          <Icon name="calendar-outline" size={18} color="#666" style={styles.dateIcon} />
          <Text style={styles.currentDate}>{getFormattedDateTime()}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Gérer mes repas</Text>

      <View style={styles.grid}>
        {/* NOUVEAUX BOUTONS */}
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('MealPlanner')}>
          <Icon name="restaurant-outline" size={40} color="#FFD700" />
          <Text style={styles.cardTitle}>Planifier les Repas</Text>
          <Text style={styles.cardDescription}>Organiser mes menus hebdomadaires</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BudgetManagement')}>
          <Icon name="wallet-outline" size={40} color="#20B2AA" />
          <Text style={styles.cardTitle}>Gestion du Budget</Text>
          <Text style={styles.cardDescription}>Suivre mes dépenses alimentaires</Text>
        </TouchableOpacity>
        {/* FIN DES NOUVEAUX BOUTONS */}

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PlatsList')}>
          <Icon name="fast-food-outline" size={40} color="green" />
          <Text style={styles.cardTitle}>Mes Plats</Text>
          <Text style={styles.cardDescription}>Voir et ajouter mes recettes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Foyer')}>
          <Icon name="home-outline" size={40} color="#007AFF" />
          <Text style={styles.cardTitle}>Mon Foyer</Text>
          <Text style={styles.cardDescription}>Gérer les membres et préférences</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Stock')}>
          <Icon name="cube-outline" size={40} color="#FF9500" />
          <Text style={styles.cardTitle}>Mon Stock</Text>
          <Text style={styles.cardDescription}>Suivre les ingrédients disponibles</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ShoppingLists')}>
          <Icon name="cart-outline" size={40} color="#AF52DE" />
          <Text style={styles.cardTitle}>Mes Listes de Courses</Text>
          <Text style={styles.cardDescription}>Accéder à mes listes et les gérer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Historique')}>
          <Icon name="timer-outline" size={40} color="#5856D6" />
          <Text style={styles.cardTitle}>Historique des repas</Text>
          <Text style={styles.cardDescription}>Voir ce que j'ai cuisiné</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Moi')}>
          <Icon name="person-outline" size={40} color="#BF5620" />
          <Text style={styles.cardTitle}>Moi</Text>
          <Text style={styles.cardDescription}>Mes préférences, mon profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('NearbyMarkets')}>
          <Icon name="location-outline" size={40} color="#E74C3C" />
          <Text style={styles.cardTitle}>Marchés Proches</Text>
          <Text style={styles.cardDescription}>Localiser les marchés à proximité</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
  },
  contentContainer: {
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'green',
    letterSpacing: 1,
    marginBottom: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0ffe0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  dateIcon: {
    marginRight: 5,
  },
  currentDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minHeight: 150,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;