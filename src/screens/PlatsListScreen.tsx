import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

// Importez les types de navigation depuis votre fichier global
import { RootStackParamList } from '../types/navigation';

type PlatsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlatsList'>;

// Interface pour un plat (peut être exportée et réutilisée)
interface Plat {
  id: string;
  nom: string;
  description: string;
  imageUrl?: string;
   createdAt?: any; // Ajouté pour le tri
  // Ajoutez d'autres propriétés de plat ici si nécessaire pour l'affichage initial
  ingredients?: Array<{ quantite: string; unite: string; nom: string }>;
  etapes?: string[];
  tempsPreparation?: number;
  tempsCuisson?: number;
  portions?: number;
  categorie?: string;
  userId?: string;
}

const PlatsListScreen: React.FC = () => {
  const navigation = useNavigation<PlatsListScreenNavigationProp>();
  const [plats, setPlats] = useState<Plat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlats = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(userId)
        .collection('plats')
        .orderBy('createdAt', 'desc')
        .get();

      const loadedPlats: Plat[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Plat[];

      setPlats(loadedPlats);
    } catch (error) {
      console.error("Erreur lors du chargement des plats:", error);
      Alert.alert('Erreur', 'Impossible de charger vos plats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('plats')
      .orderBy('createdAt', 'desc')
      .onSnapshot(querySnapshot => {
        const loadedPlats: Plat[] = [];
        querySnapshot.forEach(documentSnapshot => {
          loadedPlats.push({
            id: documentSnapshot.id,
            ...documentSnapshot.data(),
          } as Plat);
        });
        setPlats(loadedPlats);
        setLoading(false);
      }, error => {
        console.error("Erreur d'abonnement aux plats:", error);
        Alert.alert('Erreur', 'Problème de connexion aux données des plats.');
        setLoading(false);
      });

    return () => subscriber();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlats();
  };

  const renderPlatItem = ({ item }: { item: Plat }) => (
    <TouchableOpacity
      style={styles.platCard}
      onPress={() => navigation.navigate({ name: 'PlatDetail', params: { platId: item.id } })}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.platImage} />
      ) : (
        <View style={styles.platImagePlaceholder}>
          <Icon name="fast-food-outline" size={50} color="#ccc" />
        </View>
      )}
      <View style={styles.platInfo}>
        <Text style={styles.platName}>{item.nom}</Text>
        <Text style={styles.platDescription} numberOfLines={2}>{item.description}</Text>
      </View>
      <Icon name="chevron-forward" size={24} color="#666" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement de vos plats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addPlatButton}
        onPress={() => navigation.navigate('AddPlat', { platId: undefined })}
      >
        <Icon name="add-circle-outline" size={24} color="white" />
        <Text style={styles.addPlatButtonText}>Ajouter un nouveau plat</Text>
      </TouchableOpacity>

      {plats.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Icon name="sad-outline" size={60} color="#ccc" />
          <Text style={styles.emptyListText}>Aucun plat enregistré pour l'instant.</Text>
          <Text style={styles.emptyListText}>Cliquez sur le bouton ci-dessus pour en ajouter un !</Text>
        </View>
      ) : (
        <FlatList
          data={plats}
          renderItem={renderPlatItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.flatListContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
  },
  addPlatButton: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addPlatButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyListText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  flatListContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  platCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 8,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  platImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    resizeMode: 'cover',
  },
  platImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platInfo: {
    flex: 1,
    marginRight: 10,
  },
  platName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  platDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default PlatsListScreen;