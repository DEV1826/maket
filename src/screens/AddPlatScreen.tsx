import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';

// Importez les types de navigation depuis votre fichier global
import { RootStackParamList } from '../types/navigation';

type AddPlatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddPlat'>;
type AddPlatScreenRouteProp = RouteProp<RootStackParamList, 'AddPlat'>;

interface Ingredient {
  quantite: string;
  unite: string;
  nom: string;
}

const AddPlatScreen: React.FC = () => {
  const navigation = useNavigation<AddPlatScreenNavigationProp>();
  const route = useRoute<AddPlatScreenRouteProp>();
  const { platId } = route.params || {};

  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ quantite: '', unite: '', nom: '' }]);
  const [etapes, setEtapes] = useState<string[]>(['']);
  const [tempsPreparation, setTempsPreparation] = useState('');
  const [tempsCuisson, setTempsCuisson] = useState('');
  const [portions, setPortions] = useState('');
  const [categorie, setCategorie] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (platId) {
      setIsEditing(true);
      setLoading(true);
      const fetchPlat = async () => {
        const userId = auth().currentUser?.uid;
        // CORRECTED LINE BELOW:
        if (userId === null || userId === undefined) { // Check explicitly for null or undefined
          Alert.alert('Erreur', 'Utilisateur non connecté.');
          navigation.goBack();
          return;
        }
        try {
          const platDoc = await firestore()
            .collection('users')
            .doc(userId)
            .collection('plats')
            .doc(platId)
            .get();

          if (platDoc.exists()) {
            const data = platDoc.data();
            setNom(data?.nom || '');
            setDescription(data?.description || '');
            setIngredients(data?.ingredients || [{ quantite: '', unite: '', nom: '' }]);
            setEtapes(data?.etapes || ['']);
            setTempsPreparation(data?.tempsPreparation?.toString() || '');
            setTempsCuisson(data?.tempsCuisson?.toString() || '');
            setPortions(data?.portions?.toString() || '');
            setCategorie(data?.categorie || '');
            setImageUrl(data?.imageUrl || null);
            setImageUri(data?.imageUrl || null);
          } else {
            Alert.alert('Erreur', 'Plat non trouvé.');
            navigation.goBack();
          }
        } catch (error) {
          console.error("Erreur lors du chargement du plat pour modification:", error);
          Alert.alert('Erreur', 'Impossible de charger les détails du plat.');
        } finally {
          setLoading(false);
        }
      };
      fetchPlat();
    }
  }, [platId, navigation]);

  const addIngredientField = () => {
    setIngredients([...ingredients, { quantite: '', unite: '', nom: '' }]);
  };
  const removeIngredientField = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };
  const handleIngredientChange = (text: string, index: number, field: keyof Ingredient) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: text };
    setIngredients(newIngredients);
  };

  const addEtapeField = () => {
    setEtapes([...etapes, '']);
  };
  const removeEtapeField = (index: number) => {
    const newEtapes = [...etapes];
    newEtapes.splice(index, 1);
    setEtapes(newEtapes);
  };
  const handleEtapeChange = (text: string, index: number) => {
    const newEtapes = [...etapes];
    newEtapes[index] = text;
    setEtapes(newEtapes);
  };

  const pickImage = async () => {
    const options = {
      mediaType: 'photo' as 'photo', // Explicit casting
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('Sélection d\'image annulée');
      } else if (response.errorCode) {
        console.log('Erreur ImagePicker: ', response.errorMessage);
        Alert.alert('Erreur', 'Impossible de choisir l\'image.');
      } else if (response.assets && response.assets.length > 0) {
        setImageUri(response.assets[0].uri || null);
      }
    });
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const userId = auth().currentUser?.uid;
    // CORRECTED LINE BELOW:
    if (userId === null || userId === undefined) { // Check explicitly for null or undefined
      throw new Error("User not authenticated for image upload.");
    }

    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const uploadUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
    const storageRef = storage().ref(`images/${userId}/${filename}`);

    try {
      await storageRef.putFile(uploadUri);
      const url = await storageRef.getDownloadURL();
      return url;
    } catch (error) {
      console.error("Erreur d'upload d'image:", error);
      Alert.alert('Erreur', 'Impossible de télécharger l\'image.');
      throw error;
    }
  };

  const handleSavePlat = async () => {
    setLoading(true);
    const userId = auth().currentUser?.uid;

    // CORRECTED LINE BELOW:
    if (userId === null || userId === undefined) { // Check explicitly for null or undefined
      Alert.alert('Erreur', 'Vous devez être connecté pour enregistrer un plat.');
      setLoading(false);
      return;
    }
    if (!nom.trim() || !description.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir au moins le nom et la description du plat.');
      setLoading(false);
      return;
    }

    let finalImageUrl = imageUrl;
    if (imageUri && imageUri !== imageUrl) {
      try {
        finalImageUrl = await uploadImage(imageUri);
      } catch (uploadError) {
        setLoading(false);
        return;
      }
    } else if (!imageUri) {
      finalImageUrl = null;
    }

    const platData = {
      nom: nom.trim(),
      description: description.trim(),
      ingredients: ingredients.filter(ing => ing.nom.trim()),
      etapes: etapes.filter(etape => etape.trim()),
      tempsPreparation: parseInt(tempsPreparation) || 0,
      tempsCuisson: parseInt(tempsCuisson) || 0,
      portions: parseInt(portions) || 1,
      categorie: categorie.trim(),
      imageUrl: finalImageUrl,
      // Utiliser un timestamp pour la création et la mise à jour
      createdAt: isEditing ? firestore.FieldValue.serverTimestamp() : (firestore.FieldValue.serverTimestamp() || new Date()), // Ajouté un fallback pour le type
      userId: userId,
    };

    try {
      if (isEditing && platId) {
        await firestore().collection('users').doc(userId).collection('plats').doc(platId).update(platData);
        Alert.alert('Succès', 'Plat mis à jour avec succès !');
      } else {
        await firestore().collection('users').doc(userId).collection('plats').add(platData);
        Alert.alert('Succès', 'Plat ajouté avec succès !');
      }
      navigation.goBack();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du plat:", error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le plat. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
        <Text>Chargement des détails du plat...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>{isEditing ? 'Modifier un plat' : 'Ajouter un nouveau plat'}</Text>

      <Text style={styles.label}>Nom du plat :</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Poulet Yassa"
        value={nom}
        onChangeText={setNom}
      />

      <Text style={styles.label}>Description :</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Une brève description du plat..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Image du plat :</Text>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
        <Icon name="image-outline" size={20} color="#fff" />
        <Text style={styles.imagePickerButtonText}>
          {imageUri ? 'Changer l\'image' : 'Choisir une image'}
        </Text>
      </TouchableOpacity>
      {imageUri && (
        <TouchableOpacity style={styles.removeImageButton} onPress={() => { setImageUri(null); setImageUrl(null); }}>
          <Text style={styles.removeImageButtonText}>Supprimer l'image</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Ingrédients :</Text>
      {ingredients.map((ing, index) => (
        <View key={index} style={styles.ingredientRow}>
          <TextInput
            style={[styles.ingredientInput, { flex: 0.25 }]}
            placeholder="Qté"
            value={ing.quantite}
            onChangeText={(text) => handleIngredientChange(text, index, 'quantite')}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.ingredientInput, { flex: 0.25 }]}
            placeholder="Unité (g, ml, unité)"
            value={ing.unite}
            onChangeText={(text) => handleIngredientChange(text, index, 'unite')}
          />
          <TextInput
            style={[styles.ingredientInput, { flex: 0.5 }]}
            placeholder="Nom de l'ingrédient"
            value={ing.nom}
            onChangeText={(text) => handleIngredientChange(text, index, 'nom')}
          />
          {ingredients.length > 1 && (
            <TouchableOpacity onPress={() => removeIngredientField(index)} style={styles.removeButton}>
              <Icon name="remove-circle-outline" size={24} color="red" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={addIngredientField}>
        <Icon name="add-circle-outline" size={20} color="green" />
        <Text style={styles.addButtonText}>Ajouter un ingrédient</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Étapes de préparation :</Text>
      {etapes.map((etape, index) => (
        <View key={index} style={styles.etapeRow}>
          <Text style={styles.etapeNumber}>{index + 1}.</Text>
          <TextInput
            style={[styles.input, styles.etapeInput]}
            placeholder={`Étape ${index + 1}`}
            value={etape}
            onChangeText={(text) => handleEtapeChange(text, index)}
            multiline
            numberOfLines={2}
          />
          {etapes.length > 1 && (
            <TouchableOpacity onPress={() => removeEtapeField(index)} style={styles.removeButton}>
              <Icon name="remove-circle-outline" size={24} color="red" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={addEtapeField}>
        <Icon name="add-circle-outline" size={20} color="green" />
        <Text style={styles.addButtonText}>Ajouter une étape</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Temps de préparation (min) :</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 30"
        value={tempsPreparation}
        onChangeText={setTempsPreparation}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Temps de cuisson (min) :</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 45"
        value={tempsCuisson}
        onChangeText={setTempsCuisson}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Nombre de portions :</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 4"
        value={portions}
        onChangeText={setPortions}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Catégorie (Ex: Plat principal, Dessert) :</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Plat principal"
        value={categorie}
        onChangeText={setCategorie}
      />

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSavePlat}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>{isEditing ? 'Mettre à jour le plat' : 'Sauvegarder le plat'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: 'green',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    marginTop: 15,
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
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    resizeMode: 'cover',
  },
  removeImageButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  removeImageButtonText: {
    color: 'white',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 25,
    marginBottom: 15,
    color: 'green',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 5,
  },
  ingredientInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  etapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  etapeNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#555',
  },
  etapeInput: {
    flex: 1,
    paddingRight: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6ffe6',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'green',
  },
  addButtonText: {
    color: 'green',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  removeButton: {
    padding: 5,
    marginLeft: 5,
  },
  saveButton: {
    backgroundColor: 'green',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#aaddaa',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddPlatScreen;