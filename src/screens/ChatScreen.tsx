import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const chatRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('chatHistory')
        .orderBy('timestamp', 'asc');

      const snapshot = await chatRef.get();
      const chatHistory: ChatMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as ChatMessage[];

      setMessages(chatHistory);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveChatMessage = async (message: ChatMessage) => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      await firestore()
        .collection('users')
        .doc(userId)
        .collection('chatHistory')
        .add({
          text: message.text,
          isUser: message.isUser,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    // Save user message
    await saveChatMessage(userMessage);

    // Simulate AI response (replace with actual AI API call)
    setTimeout(async () => {
      const aiResponse = await getAIResponse(userMessage.text);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      await saveChatMessage(aiMessage);
      setLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1000);
  };

  const getAIResponse = async (userInput: string): Promise<string> => {
    // This is a mock AI response. In a real app, you would call an AI API like OpenAI
    const responses = [
      "En tant que spécialiste culinaire, je peux vous aider avec vos recettes ! Que souhaitez-vous cuisiner aujourd'hui ?",
      "Pour cette recette, je recommande d'utiliser des ingrédients frais. Avez-vous tous les ingrédients nécessaires ?",
      "Cette technique de cuisson est parfaite pour ce type de plat. Voulez-vous que je vous explique étape par étape ?",
      "En cuisine, la température et le timing sont cruciaux. Assurez-vous de préchauffer votre four à la bonne température.",
      "Cette combinaison d'épices va donner un goût exceptionnel à votre plat. N'hésitez pas à ajuster selon vos préférences !",
      "Pour une présentation parfaite, pensez à la disposition des éléments dans l'assiette. La cuisine, c'est aussi un art visuel !",
    ];

    // Simple keyword-based responses
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('recette') || lowerInput.includes('cuisiner')) {
      return "Excellente question ! En tant que chef virtuel, je peux vous aider à créer des recettes délicieuses. Quel type de plat vous intéresse ? Entrée, plat principal, ou dessert ?";
    }
    
    if (lowerInput.includes('ingrédient') || lowerInput.includes('ingredient')) {
      return "Les ingrédients de qualité sont la base d'un bon plat ! Privilégiez toujours les produits frais et de saison. Quel ingrédient vous pose question ?";
    }
    
    if (lowerInput.includes('cuisson') || lowerInput.includes('cuire')) {
      return "La cuisson est un art ! Chaque technique a ses spécificités. Voulez-vous des conseils sur une méthode de cuisson particulière ?";
    }
    
    if (lowerInput.includes('temps') || lowerInput.includes('durée')) {
      return "Le timing en cuisine est essentiel ! Cela dépend du type de plat et de la méthode de cuisson. Pouvez-vous me donner plus de détails sur ce que vous préparez ?";
    }

    // Return a random response if no keywords match
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.aiBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userText : styles.aiText
        ]}>
          {item.text}
        </Text>
      </View>
      {!item.isUser && (
        <Icon 
          name="chef-hat" 
          size={20} 
          color="#f57c00" 
          style={styles.aiIcon} 
        />
      )}
    </View>
  );

  if (loadingHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2d5a" />
        <Text style={styles.loadingText}>Chargement de la conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="chef-hat" size={24} color="#f57c00" />
          <Text style={styles.headerTitle}>Assistant Culinaire IA</Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Effacer la conversation',
              'Voulez-vous vraiment effacer toute la conversation ?',
              [
                { text: 'Annuler', style: 'cancel' },
                { 
                  text: 'Effacer', 
                  style: 'destructive',
                  onPress: async () => {
                    setMessages([]);
                    // Clear from Firestore
                    try {
                      const userId = auth().currentUser?.uid;
                      if (userId) {
                        const batch = firestore().batch();
                        const chatRef = firestore()
                          .collection('users')
                          .doc(userId)
                          .collection('chatHistory');
                        const snapshot = await chatRef.get();
                        snapshot.docs.forEach(doc => {
                          batch.delete(doc.ref);
                        });
                        await batch.commit();
                      }
                    } catch (error) {
                      console.error('Error clearing chat:', error);
                    }
                  }
                }
              ]
            );
          }}
          style={styles.clearButton}
        >
          <Icon name="delete" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#f57c00" />
          <Text style={styles.typingText}>L'assistant culinaire réfléchit...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Posez votre question culinaire..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || loading}
        >
          <Icon 
            name="send" 
            size={20} 
            color={!inputText.trim() ? "#ccc" : "#fff"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#1a2d5a',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#1a2d5a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  clearButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#1a2d5a',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  aiIcon: {
    marginLeft: 8,
    marginTop: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    marginLeft: 8,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#f57c00',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#ddd',
  },
});

export default ChatScreen;
