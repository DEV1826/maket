import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Navigation from './Navigation';
import { initializeApp } from 'firebase/app'; // <-- Importez initializeApp ici
import auth from '@react-native-firebase/auth'; // <-- Gardez cette importation pour les hooks d'authentification
import { GoogleSignin } from '@react-native-google-signin/google-signin'; // <-- Importez GoogleSignin ici
import { Alert } from 'react-native';

// Votre configuration Firebase (Assurez-vous que c'est la bonne)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Remplacez par votre clé API réelle
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const App = () => {
  useEffect(() => {
    // Initialisation de Firebase
    try {
      initializeApp(firebaseConfig);
      console.log('Firebase initialized'); // Pour débogage

      // Configuration de Google Sign-In
      const configureGoogleSignin = async () => {
        try {
          await GoogleSignin.configure({
            webClientId: 'YOUR_WEB_CLIENT_ID', // Remplacez par votre webClientId réel
            offlineAccess: true,
          });
          console.log('Google Sign-In configured'); // Pour débogage

          // Optionnel: Vérifier la disponibilité de Google Play Services
          const isPlayServicesAvailable = await GoogleSignin.hasPlayServices();
          if (!isPlayServicesAvailable) {
            Alert.alert('Erreur', 'Google Play Services non disponibles sur votre appareil');
          }
        } catch (error) {
          console.error('Erreur configuration Google Sign-In:', error);
          Alert.alert('Erreur', 'Impossible de configurer Google Sign-In');
        }
      };
      configureGoogleSignin();

    } catch (error) {
      console.error('Erreur initialisation Firebase:', error);
      Alert.alert('Erreur', 'Impossible d\'initialiser Firebase. Vérifiez votre configuration.');
    }
  }, []); // Le tableau vide assure que cela ne s'exécute qu'une fois au montage du composant.

  return (
    <NavigationContainer>
      <Navigation />
    </NavigationContainer>
  );
};

export default App;