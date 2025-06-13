import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI('AIzaSyCQmAnJ4QLHbqna7LiJsgY32xjW-JzXfaE');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Define the types for our AI features
type AIFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
  promptTemplate: string;
  placeholder: string;
};

const AIAssistantScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedFeature, setSelectedFeature] = useState<AIFeature | null>(null);
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState<string[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [additionalIngredients, setAdditionalIngredients] = useState('');

  // Define our AI features
  const aiFeatures: AIFeature[] = [
    {
      id: 'smart-recipe',
      title: 'Recettes Intelligentes',
      description: 'Générer des recettes basées sur les ingrédients disponibles',
      icon: 'restaurant',
      promptTemplate: 'Je veux cuisiner avec les ingrédients suivants: {{ingredients}}. Suggère-moi une recette délicieuse, facile à préparer avec des instructions détaillées. Inclure le temps de préparation, le temps de cuisson et les valeurs nutritionnelles approximatives. Répondre en français.',
      placeholder: 'Quels ingrédients avez-vous? (ou laissez vide pour utiliser votre stock)'
    },
    {
      id: 'meal-planning',
      title: 'Planification de Repas',
      description: 'Créer un plan de repas équilibré pour la semaine',
      icon: 'calendar',
      promptTemplate: 'Crée-moi un plan de repas équilibré pour {{days}} jours avec les contraintes suivantes: {{constraints}}. Pour chaque jour, suggère un petit-déjeuner, déjeuner et dîner. Inclure une liste d\'achats organisée par catégorie. Répondre en français.',
      placeholder: 'Préférences alimentaires, allergies ou restrictions? (ex: végétarien, sans gluten)'
    },
    {
      id: 'cooking-guide',
      title: 'Guide de Cuisine',
      description: 'Assistant de cuisine interactif étape par étape',
      icon: 'book',
      promptTemplate: 'Je veux cuisiner {{dish}}. Donne-moi un guide étape par étape détaillé. Inclure des conseils de chef pour chaque étape critique, des alternatives pour les ingrédients difficiles à trouver, et comment savoir quand le plat est parfaitement cuit. Répondre en français.',
      placeholder: 'Quel plat voulez-vous cuisiner?'
    }
  ];

  useEffect(() => {
    // Fetch user's stock items when component mounts or when selectedFeature changes to smart-recipe
    if (!selectedFeature || selectedFeature.id === 'smart-recipe') {
      fetchUserStock();
    }
  }, [selectedFeature]);

  const fetchUserStock = async () => {
    setStockLoading(true);
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        setStockItems([]);
        setStockLoading(false);
        return;
      }

      console.log('Fetching stock items for user:', userId);
      
      // Use a real-time listener to get stock items
      const userStockRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('stock')
        .orderBy('nom', 'asc');
      
      const stockSnapshot = await userStockRef.get();
      
      if (stockSnapshot.empty) {
        console.log('No stock items found');
        setStockItems([]);
        setStockLoading(false);
        return;
      }
      
      // Extract ingredient names from stock items
      const items = stockSnapshot.docs
        .map(doc => {
          const data = doc.data();
          // In StockScreen, the field is 'nom' not 'name'
          return data.nom || ''; 
        })
        .filter(name => name.trim() !== ''); // Filter out empty strings

      setStockItems(items);
      console.log('Fetched stock items:', items);
    } catch (error) {
      console.error('Error fetching stock:', error);
      setStockItems([]);
      Alert.alert('Erreur', 'Impossible de récupérer vos ingrédients. Veuillez les saisir manuellement.');
    } finally {
      setStockLoading(false);
    }
  };

  const generateAIResponse = async () => {
    if (!selectedFeature) return;
    
    setLoading(true);
    setAiResponse(null);
    
    try {
      let prompt = selectedFeature.promptTemplate;
      
      // Replace template variables with actual values
      if (selectedFeature.id === 'smart-recipe') {
        // Make sure we have the latest stock items
        await fetchUserStock();
        
        // Combine stock items and additional ingredients from user input
        let ingredients = '';
        
        if (stockItems.length > 0) {
          ingredients = stockItems.join(', ');
          
          // Add additional ingredients if provided
          if (additionalIngredients.trim()) {
            ingredients += ', ' + additionalIngredients.trim();
          }
          
          console.log('Using ingredients from stock and additional input:', ingredients);
        } else {
          // If no stock items, use additional ingredients
          if (!additionalIngredients.trim()) {
            Alert.alert('Attention', 'Aucun ingrédient disponible. Veuillez saisir au moins un ingrédient.');
            setLoading(false);
            return;
          }
          ingredients = additionalIngredients.trim();
          console.log('No stock items found, using only additional ingredients:', ingredients);
        }
        
        prompt = prompt.replace('{{ingredients}}', ingredients);
      } else if (selectedFeature.id === 'meal-planning') {
        const constraints = userInput || 'équilibré, varié';
        prompt = prompt.replace('{{constraints}}', constraints);
        prompt = prompt.replace('{{days}}', '7');
      } else if (selectedFeature.id === 'cooking-guide') {
        const dish = userInput || 'ratatouille traditionnelle';
        prompt = prompt.replace('{{dish}}', dish);
      }
      
      console.log('Sending prompt to Gemini:', prompt);
      
      // Call the Gemini API
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      setAiResponse(text);
    } catch (error) {
      console.error('Error generating AI response:', error);
      Alert.alert('Erreur', 'Impossible de générer une réponse. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const saveToCollection = async () => {
    if (!aiResponse || !selectedFeature) return;
    
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        Alert.alert('Erreur', 'Vous devez être connecté pour sauvegarder.');
        return;
      }
      
      let collectionName = 'savedRecipes';
      if (selectedFeature.id === 'meal-planning') {
        collectionName = 'mealPlans';
      }
      
      await firestore()
        .collection('users')
        .doc(userId)
        .collection(collectionName)
        .add({
          content: aiResponse,
          title: userInput || `${selectedFeature.title} ${new Date().toLocaleDateString()}`,
          createdAt: firestore.FieldValue.serverTimestamp(),
          featureId: selectedFeature.id
        });
      
      Alert.alert('Succès', 'Contenu sauvegardé avec succès!');
    } catch (error) {
      console.error('Error saving content:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le contenu.');
    }
  };

  const renderFeatureSelection = () => (
    <ScrollView style={styles.featureContainer}>
      <Text style={styles.sectionTitle}>Assistant Cuisine IA</Text>
      <Text style={styles.sectionDescription}>
        Utilisez l'intelligence artificielle pour améliorer votre expérience culinaire
      </Text>
      
      {aiFeatures.map((feature) => (
        <TouchableOpacity
          key={feature.id}
          style={styles.featureCard}
          onPress={() => setSelectedFeature(feature)}
        >
          <Icon name={feature.icon} size={40} color="#4CAF50" />
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#757575" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderFeatureInteraction = () => (
    <View style={styles.interactionContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setSelectedFeature(null);
          setUserInput('');
          setAiResponse(null);
          setAdditionalIngredients('');
        }}
      >
        <Icon name="arrow-back" size={24} color="#4CAF50" />
        <Text style={styles.backButtonText}>Retour</Text>
      </TouchableOpacity>

      <Text style={styles.featureTitle}>{selectedFeature?.title}</Text>
      <Text style={styles.featureDescription}>{selectedFeature?.description}</Text>

      {selectedFeature?.id === 'smart-recipe' ? (
        <>
          {stockLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Chargement de votre stock...</Text>
            </View>
          ) : stockItems.length > 0 ? (
            <View style={styles.stockContainer}>
              <Text style={styles.stockTitle}>Ingrédients disponibles dans votre stock:</Text>
              <View style={styles.stockItemsContainer}>
                {stockItems.map((item, index) => (
                  <View key={index} style={styles.stockItem}>
                    <Text style={styles.stockItemText}>{item}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.additionalIngredientsLabel}>Ajouter d'autres ingrédients (optionnel):</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingrédients supplémentaires séparés par des virgules"
                value={additionalIngredients}
                onChangeText={setAdditionalIngredients}
                multiline
              />
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchUserStock}
              >
                <Icon name="refresh-outline" size={16} color="#4CAF50" />
                <Text style={styles.refreshButtonText}>Actualiser les ingrédients</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.noStockMessage}>Aucun ingrédient trouvé dans votre stock.</Text>
              <Text style={styles.additionalIngredientsLabel}>Veuillez saisir les ingrédients disponibles:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingrédients séparés par des virgules (ex: tomates, oignons, riz)"
                value={additionalIngredients}
                onChangeText={setAdditionalIngredients}
                multiline
              />
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchUserStock}
              >
                <Icon name="refresh-outline" size={16} color="#4CAF50" />
                <Text style={styles.refreshButtonText}>Vérifier à nouveau</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <TextInput
          style={styles.input}
          placeholder={selectedFeature?.placeholder}
          value={userInput}
          onChangeText={setUserInput}
          multiline
        />
      )}

      <TouchableOpacity
        style={styles.generateButton}
        onPress={generateAIResponse}
        disabled={loading}
      >
        <Text style={styles.generateButtonText}>
          {loading ? 'Génération en cours...' : 'Générer'}
        </Text>
        {loading && <ActivityIndicator color="#fff" style={{marginLeft: 10}} />}
      </TouchableOpacity>

      {aiResponse && (
        <View style={styles.responseContainer}>
          <ScrollView style={styles.responseScroll}>
            <Text style={styles.responseText}>{aiResponse}</Text>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveToCollection}
          >
            <Icon name="bookmark-outline" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Sauvegarder</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {selectedFeature ? renderFeatureInteraction() : renderFeatureSelection()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  featureContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a2d5a',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  featureTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2d5a',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  interactionContainer: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#f57c00',
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  generateButton: {
    backgroundColor: '#f57c00',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseContainer: {
    marginTop: 20,
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  responseScroll: {
    flex: 1,
  },
  responseText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  saveButton: {
    backgroundColor: '#1a2d5a',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // New styles for stock items display
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  stockContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stockTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stockItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  stockItem: {
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 124, 0, 0.3)',
  },
  stockItemText: {
    fontSize: 14,
    color: '#f57c00',
  },
  additionalIngredientsLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  noStockMessage: {
    fontSize: 16,
    color: '#f57c00',
    fontStyle: 'italic',
    marginVertical: 10,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 45, 90, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 45, 90, 0.3)',
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#1a2d5a',
    marginLeft: 5,
  },
});

export default AIAssistantScreen;
