import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import Icon from 'react-native-vector-icons/Ionicons';

// Importez les types de navigation depuis votre fichier global
import { RootStackParamList } from '../types/navigation';

type PlatDetailScreenRouteProp = RouteProp<RootStackParamList, 'PlatDetail'>;
type PlatDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlatDetail'>;

interface Ingredient {
  quantite: string;
  unite: string;
  nom: string;
}

interface Plat {
  id: string;
  nom: string;
  description: string;
  imageUrl?: string;
  imageUri?: string; // Added for local image URI support
  ingredients?: Ingredient[];
  etapes?: string[];
  tempsPreparation?: number;
  tempsCuisson?: number;
  portions?: number;
  categorie?: string;
  createdAt?: any;
  userId?: string;
}

const PlatDetailScreen: React.FC = () => {
  const route = useRoute<PlatDetailScreenRouteProp>();
  const navigation = useNavigation<PlatDetailScreenNavigationProp>();
  const { platId } = route.params;

  const [loading, setLoading] = useState(true);
  const [plat, setPlat] = useState<Plat | null>(null);

  const fetchPlatDetails = async () => {
    setLoading(true);
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      navigation.goBack();
      return;
    }
    try {
      const docSnapshot = await firestore().collection('users')
        .doc(userId)
        .collection('plats')
        .doc(platId)
        .get();

      if (!docSnapshot.exists) {
        Alert.alert('Erreur', 'Plat non trouvé.');
        navigation.goBack();
        return;
      }

      const platData = docSnapshot.data() as Plat;
      setPlat({ ...platData, id: docSnapshot.id });
    } catch (error) {
      console.error("Erreur lors du chargement des détails du plat:", error);
      Alert.alert('Erreur', 'Impossible de charger les détails du plat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatDetails();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={styles.loadingText}>Chargement des détails du plat...</Text>
      </View>
    );
  }

  if (!plat) {
    return null;
  }

  const handleDeletePlat = () => {
    Alert.alert(
      "Supprimer le plat",
      "Êtes-vous sûr de vouloir supprimer ce plat ? Cette action est irréversible.",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          onPress: async () => {
            setLoading(true);
            const userId = auth().currentUser?.uid;
            if (!userId) {
              Alert.alert('Erreur', 'Utilisateur non connecté.');
              setLoading(false);
              return;
            }
            try {
              // Optionnel: Supprimer l'image associée de Storage
              if (plat?.imageUrl) {
                const imageRef = storage().refFromURL(plat.imageUrl);
                await imageRef.delete();
              }
              await firestore().collection('users').doc(userId).collection('plats').doc(platId).delete();
              Alert.alert('Succès', 'Plat supprimé avec succès !');
              navigation.goBack(); // Revenir à la liste des plats
            } catch (error) {
              console.error("Erreur lors de la suppression du plat:", error);
              Alert.alert('Erreur', 'Impossible de supprimer le plat.');
            } finally {
              setLoading(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={styles.loadingText}>Chargement des détails du plat...</Text>
      </View>
    );
  }

  if (!plat) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Plat non trouvé.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {plat.imageUrl || plat.imageUri ? (
        <Image 
          source={{ uri: plat.imageUrl || plat.imageUri }} 
          style={styles.platImage}
          resizeMode="cover"
          onError={(error) => console.log('Image load error:', error.nativeEvent.error)}
        />
      ) : (
        <View style={styles.platImagePlaceholder}>
          <Icon name="fast-food-outline" size={100} color="#3a4f7a" />
          <Text style={styles.noImageText}>Pas d'image pour ce plat</Text>
        </View>
      )}

      <Text style={styles.platName}>{plat.nom}</Text>
      <Text style={styles.platDescription}>{plat.description}</Text>

      <View style={styles.infoContainer}>
        {plat.tempsPreparation !== undefined && plat.tempsPreparation > 0 && (
          <View style={styles.infoItem}>
            <Icon name="hourglass-outline" size={20} color="#333" />
            <Text style={styles.infoText}>Préparation: {plat.tempsPreparation} min</Text>
          </View>
        )}
        {plat.tempsCuisson !== undefined && plat.tempsCuisson > 0 && (
          <View style={styles.infoItem}>
            <Icon name="flame-outline" size={20} color="#333" />
            <Text style={styles.infoText}>Cuisson: {plat.tempsCuisson} min</Text>
          </View>
        )}
        {plat.portions !== undefined && plat.portions > 0 && (
          <View style={styles.infoItem}>
            <Icon name="people-outline" size={20} color="#333" />
            <Text style={styles.infoText}>Portions: {plat.portions}</Text>
          </View>
        )}
        {plat.categorie && (
          <View style={styles.infoItem}>
            <Icon name="pricetag-outline" size={20} color="#333" />
            <Text style={styles.infoText}>Catégorie: {plat.categorie}</Text>
          </View>
        )}
      </View>

      {plat.ingredients && plat.ingredients.length > 0 && plat.ingredients[0].nom.trim() !== '' && (
        <>
          <Text style={styles.sectionTitle}>Ingrédients</Text>
          <View style={styles.listContainer}>
            {plat.ingredients.map((ing, index) => (
              ing.nom.trim() !== '' && ( // Assurez-vous que l'ingrédient n'est pas vide
                <View key={index} style={styles.listItem}>
                  <Icon name="leaf-outline" size={16} color="green" style={styles.listIcon} />
                  <Text style={styles.listItemText}>
                    {ing.quantite} {ing.unite} {ing.nom}
                  </Text>
                </View>
              )
            ))}
          </View>
        </>
      )}

      {plat.etapes && plat.etapes.length > 0 && plat.etapes[0].trim() !== '' && (
        <>
          <Text style={styles.sectionTitle}>Préparation</Text>
          <View style={styles.listContainer}>
            {plat.etapes.map((etape, index) => (
              etape.trim() !== '' && ( // Assurez-vous que l'étape n'est pas vide
                <View key={index} style={styles.listItem}>
                  <Text style={styles.stepNumber}>{index + 1}.</Text>
                  <Text style={styles.listItemText}>{etape}</Text>
                </View>
              )
            ))}
          </View>
        </>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('AddPlat', { 
            platId: plat.id,
            imageUrl: plat.imageUrl
          })}
        >
          <Icon name="create-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeletePlat}
        >
          <Icon name="trash-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2f5a',
  },
  contentContainer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: '#1a2f5a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2f5a',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2f5a',
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
  },
  platImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    marginBottom: 20,
    resizeMode: 'cover',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  platImagePlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  noImageText: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: 16,
  },
  platName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ff8c00',
    marginBottom: 10,
    textAlign: 'center',
  },
  platDescription: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 25,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#3a4f7a',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a3f6a',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff8c00',
    marginTop: 30,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3a4f7a',
    paddingBottom: 5,
  },
  listContainer: {
    backgroundColor: '#2a3f6a',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  listIcon: {
    marginRight: 10,
    marginTop: 3,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 22,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff8c00',
    marginRight: 10,
    width: 25, // Fixed width for number
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editButton: {
    backgroundColor: '#ff8c00', // Yellow/orange
  },
  deleteButton: {
    backgroundColor: '#dc3545', // Rouge
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default PlatDetailScreen;