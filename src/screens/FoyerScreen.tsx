import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';

interface MembreFoyer {
  id: string;
  nom: string;
  preferences?: string; // Ex: végétarien, allergies, etc.
}

const FoyerScreen: React.FC = () => {
  const [membres, setMembres] = useState<MembreFoyer[]>([]);
  const [nouveauMembreNom, setNouveauMembreNom] = useState('');
  const [nouveauMembrePrefs, setNouveauMembrePrefs] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingMembre, setAddingMembre] = useState(false);

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      setLoading(false);
      return;
    }

    // Abonnement aux changements en temps réel de la sous-collection 'foyer_membres'
    const subscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('foyer_membres')
      .orderBy('nom', 'asc') // Tri par nom
      .onSnapshot(
        querySnapshot => {
          const loadedMembres: MembreFoyer[] = [];
          querySnapshot.forEach(documentSnapshot => {
            loadedMembres.push({
              id: documentSnapshot.id,
              ...documentSnapshot.data(),
            } as MembreFoyer);
          });
          setMembres(loadedMembres);
          setLoading(false);
        },
        error => {
          console.error("Erreur d'abonnement aux membres du foyer:", error);
          Alert.alert(
            'Erreur',
            'Problème de connexion aux données de votre foyer.'
          );
          setLoading(false);
        }
      );

    // Arrête l'abonnement lorsque le composant est démonté
    return () => subscriber();
  }, []);

  const handleAddMembre = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    if (!nouveauMembreNom.trim()) {
      Alert.alert('Erreur', 'Le nom du membre ne peut pas être vide.');
      return;
    }

    setAddingMembre(true);
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('foyer_membres')
        .add({
          nom: nouveauMembreNom.trim(),
          preferences: nouveauMembrePrefs.trim(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setNouveauMembreNom('');
      setNouveauMembrePrefs('');
      Alert.alert('Succès', 'Membre ajouté avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le membre. Veuillez réessayer.');
    } finally {
      setAddingMembre(false);
    }
  };

  const handleDeleteMembre = (membreId: string, membreNom: string) => {
    Alert.alert(
      'Supprimer un membre',
      `Voulez-vous vraiment supprimer ${membreNom} de votre foyer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: async () => {
            const userId = auth().currentUser?.uid;
            if (!userId) {
              Alert.alert('Erreur', 'Utilisateur non connecté.');
              return;
            }
            try {
              await firestore()
                .collection('users')
                .doc(userId)
                .collection('foyer_membres')
                .doc(membreId)
                .delete();
              Alert.alert('Succès', `${membreNom} a été supprimé.`);
            } catch (error) {
              console.error('Erreur lors de la suppression du membre:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le membre.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement des membres du foyer...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon Foyer</Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputWithHelp}>
          <TextInput
            style={styles.input}
            placeholder="Nom du membre"
            value={nouveauMembreNom}
            onChangeText={setNouveauMembreNom}
          />
          <Text style={styles.helpText}>Exemple: Papa, Maman, Enfant 1</Text>
        </View>
        <View style={styles.inputWithHelp}>
          <TextInput
            style={styles.input}
            placeholder="Préférences"
            value={nouveauMembrePrefs}
            onChangeText={setNouveauMembrePrefs}
          />
          <Text style={styles.helpText}>Exemple: Végétarien, Allergie aux noix, Diabétique</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, addingMembre && styles.addButtonDisabled]}
          onPress={handleAddMembre}
          disabled={addingMembre}
        >
          {addingMembre ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="person-add-outline" size={20} color="white" />
              <Text style={styles.addButtonText}>Ajouter un membre</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {membres.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Icon name="people-outline" size={60} color="#ccc" />
          <Text style={styles.emptyListText}>Aucun membre dans votre foyer.</Text>
          <Text style={styles.emptyListText}>Ajoutez-en un ci-dessus !</Text>
        </View>
      ) : (
        <FlatList
          data={membres}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.membreCard}>
              <View style={styles.membreInfo}>
                <Icon name="person-circle-outline" size={24} color="green" />
                <Text style={styles.membreName}>{item.nom}</Text>
              </View>
              {item.preferences && (
                <Text style={styles.membrePreferences}>Prefs: {item.preferences}</Text>
              )}
              <TouchableOpacity
                onPress={() => handleDeleteMembre(item.id, item.nom)}
                style={styles.deleteButton}
              >
                <Icon name="trash-outline" size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: '#aaddaa',
  },
  addButtonText: {
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
  listContent: {
    paddingBottom: 20,
  },
  membreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  membreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  membreName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  membrePreferences: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  deleteButton: {
    marginLeft: 15,
    padding: 5,
  },
  inputWithHelp: {
    marginBottom: 15,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginLeft: 10,
  },
});

export default FoyerScreen;