import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { FirebaseService } from '../utils/firebaseConfig';

//  navigation 
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
  const { platId, imageUrl: routeImageUrl } = route.params || {};

  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ quantite: '', unite: '', nom: '' }]);
  const [etapes, setEtapes] = useState<string[]>(['']);
  const [tempsPreparation, setTempsPreparation] = useState('');
  const [tempsCuisson, setTempsCuisson] = useState('');
  const [portions, setPortions] = useState('');
  const [categorie, setCategorie] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    // Set image from route params if available (when coming from PlatDetailScreen)
    if (routeImageUrl) {
      setImageUri(routeImageUrl);
    }
    
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
          const result = await FirebaseService.getPlat(platId);
          
          if (result.success && result.data) {
            const data = result.data as any;
            setNom(data.nom ?? '');
            setDescription(data.description ?? '');
            setIngredients(data.ingredients ?? [{ quantite: '', unite: '', nom: '' }]);
            setEtapes(data.etapes ?? ['']);
            setTempsPreparation(data.tempsPreparation?.toString() ?? '');
            setTempsCuisson(data.tempsCuisson?.toString() ?? '');
            setPortions(data.portions?.toString() ?? '');
            setCategorie(data.categorie ?? '');
            // Use imageUrl from Firestore instead of imageUri
            if (data.imageUrl && !routeImageUrl) {
              setImageUri(data.imageUrl);
            }
          } else {
            Alert.alert('Erreur', result.error ?? 'Plat non trouvé.');
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
      mediaType: 'photo' as 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8 as 0.8,
      saveToPhotos: false,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('Sélection d\'image annulée');
      } else if (response.errorCode) {
        console.log('Erreur ImagePicker: ', response.errorMessage);
        Alert.alert('Erreur', 'Impossible de choisir l\'image.');
      } else if (response.assets && response.assets.length > 0) {
        const selectedAsset = response.assets[0];
        setImageUri(selectedAsset.uri || null);
      }
    });
  };

  const handleSavePlat = async () => {
    setLoading(true);
    const userId = auth().currentUser?.uid;

    if (!userId) {
      Alert.alert('Erreur', 'Vous devez être connecté pour enregistrer un plat.');
      setLoading(false);
      return;
    }
    if (!nom.trim() || !description.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir au moins le nom et la description du plat.');
      setLoading(false);
      return;
    }

    try {
      // Handle image upload if there's a new image
      let imageUrl = routeImageUrl; // Default to the existing image URL
      
      if (imageUri && imageUri !== routeImageUrl) {
        try {
          // If we have a new image that's different from the original one
          // Upload the new image to Firebase Storage
          const imageFileName = `plats/${userId}/${Date.now()}.jpg`;
          const reference = storage().ref(imageFileName);
          
          // If we're editing and replacing an existing image, try to delete the old one
          if (isEditing && routeImageUrl) {
            try {
              const oldImageRef = storage().refFromURL(routeImageUrl);
              await oldImageRef.delete();
            } catch (deleteError) {
              console.log('Error deleting old image, continuing anyway:', deleteError);
              // Continue with upload even if delete fails
            }
          }
          
          // Upload the new image
          await reference.putFile(imageUri);
          imageUrl = await reference.getDownloadURL();
        } catch (storageError) {
          console.error('Storage error:', storageError);
          // Continue without image if storage fails
          Alert.alert('Avertissement', 'Impossible de télécharger l\'image. Le plat sera sauvegardé sans image.');
          imageUrl = routeImageUrl; // Keep existing image or null
        }
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
        imageUrl: imageUrl, // Store the Firebase Storage URL
      };

      let result;
      if (isEditing && platId) {
        result = await FirebaseService.updatePlat(platId, platData);
      } else {
        result = await FirebaseService.addPlat(platData);
      }

      if (result.success) {
        Alert.alert('Succès', isEditing ? 'Plat mis à jour avec succès !' : 'Plat ajouté avec succès !');
        navigation.goBack();
      } else {
        Alert.alert('Erreur', result.error ?? 'Impossible d\'enregistrer le plat');
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du plat:", error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le plat. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const searchForExistingPlat = async (nomToSearch: string) => {
    if (nomToSearch.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await FirebaseService.searchPublicPlats(nomToSearch);
      
      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        console.log('Search failed:', result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching for plats:', error);
      setSearchResults([]);
    }
  };

  const selectExistingPlat = (plat: any) => {
    // Show confirmation dialog for quick add
    Alert.alert(
      'Ajouter ce plat',
      `Voulez-vous ajouter "${plat.displayName}" directement à vos plats ou le modifier d'abord ?`,
      [
        {
          text: 'Modifier d\'abord',
          onPress: () => {
            // Fill the form with the selected plat data
            setNom(plat.nom || '');
            setDescription(plat.description || '');
            setCategorie(''); // Not available in public_plats structure
            
            // Set image from public plat (use first image if available)
            if (plat.imageUrl) {
              setImageUri(plat.imageUrl);
            }
            
            // Initialize empty arrays since public_plats doesn't have detailed ingredients/steps
            setIngredients([{ quantite: '', unite: '', nom: '' }]);
            setEtapes(['']);
            setTempsPreparation('');
            setTempsCuisson('');
            setPortions('');
            
            // Clear search results
            setSearchResults([]);
          }
        },
        {
          text: 'Ajouter directement',
          onPress: () => quickAddPlat(plat)
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  };

  const quickAddPlat = async (plat: any) => {
    setLoading(true);
    
    try {
      const platData = {
        nom: plat.nom || '',
        description: plat.description || '',
        ingredients: [], // Empty since public_plats doesn't have detailed ingredients
        etapes: [], // Empty since public_plats doesn't have detailed steps
        tempsPreparation: 0,
        tempsCuisson: 0,
        portions: 1,
        categorie: '',
        imageUrl: plat.imageUrl || null, // Use the first image from imageUrls
      };

      const result = await FirebaseService.addPlat(platData);

      if (result.success) {
        Alert.alert('Succès', `"${plat.displayName}" a été ajouté à vos plats !`);
        navigation.goBack();
      } else {
        Alert.alert('Erreur', result.error ?? 'Impossible d\'ajouter le plat');
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout rapide du plat:", error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le plat. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2d5a" />
        <Text style={{ color: '#1a2d5a', marginTop: 10 }}>Chargement des détails du plat...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.heading}>{isEditing ? 'Modifier le Plat' : 'Ajouter un Nouveau Plat'}</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Nom du plat</Text>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={(text) => {
            setNom(text);
            if (!isEditing) {
              searchForExistingPlat(text);
            }
          }}
          placeholder="Nom du plat"
        />
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.searchResultItem}
                onPress={() => selectExistingPlat(result)}
              >
                <View style={styles.searchResultContent}>
                  {result.imageUrl && (
                    <Image 
                      source={{ uri: result.imageUrl }} 
                      style={styles.searchResultImage} 
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.searchResultTextContainer}>
                    <Text style={styles.searchResultTitle}>{result.displayName}</Text>
                    {result.description && (
                      <Text style={styles.searchResultCategory} numberOfLines={2}>
                        {result.description}
                      </Text>
                    )}
                    {result.origine && (
                      <Text style={styles.searchResultOrigin}>Origine: {result.origine}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

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
        <TouchableOpacity style={styles.removeImageButton} onPress={() => { setImageUri(null); }}>
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
        <Icon name="add-circle-outline" size={20} color="#ff8c00" />
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
        <Icon name="add-circle-outline" size={20} color="#ff8c00" />
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
  formGroup: {
    marginBottom: 15,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f8ff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a2d5a',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a2f5a', // Navy blue
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: '#ff8c00', // Yellow/orange color
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 10,
    resizeMode: 'cover',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
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
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 15,
    color: '#1a2f5a', // Navy blue
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    backgroundColor: '#fff8e6', // Light yellow background
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ff8c00', // Yellow/orange border
  },
  addButtonText: {
    color: '#ff8c00', // Yellow/orange text
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  removeButton: {
    padding: 5,
    marginLeft: 5,
  },
  saveButton: {
    backgroundColor: '#1a2f5a', // Navy blue
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#8f9bba', // Lighter navy blue
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  searchResultsContainer: {
    marginTop: 5,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2d5a',
  },
  searchResultCategory: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  searchResultOrigin: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default AddPlatScreen;