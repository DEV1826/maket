import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, SafeAreaView, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { initializeApp } from 'firebase/app';
import auth from '@react-native-firebase/auth';
import { GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin, GoogleSigninButton, type SignInResponse } from '@react-native-google-signin/google-signin';
import { useNavigation, ParamListBase } from '@react-navigation/native';
import { styles } from './styles/AuthScreenStyles';

const firebaseConfig = {
  apiKey: "AIzaSyCaouMDrjm3Y2VLqsnGWccG1aOrpd4W6D8",
  authDomain: "market-c0fa5.firebaseapp.com",
  projectId: "market-c0fa5",
  storageBucket: "market-c0fa5.firebasestorage.app",
  messagingSenderId: "45874691553",
  appId: "1:45874691553:android:e62568230ffe41c42ba6a0"
};

interface RootStackParamList extends ParamListBase {
  Home: undefined;
  Auth: undefined;
  Main: undefined;
}

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC = () => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Initialisation et configuration
  useEffect(() => {
    try {
      //  Firebase est déjà initialisé
      const app = initializeApp(firebaseConfig, 'market-app');
      console.log('Firebase initialized successfully');
      
      const configureGoogleSignin = async () => {
        try {
          await GoogleSignin.configure({
            webClientId: '45874691553-0h9hvvvv3i40ss6kbik89apjdt53i2tm.apps.googleusercontent.com',
            offlineAccess: true
          });
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
      Alert.alert('Erreur', 'Impossible d\'initialiser Firebase');
    }
  }, []);

  // Vérification de l'authentification existante
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = auth().currentUser;
        if (user) {
          navigation.navigate('Home');
        }
      } catch (error) {
        console.error('Erreur vérification auth:', error);
      }
    };
    checkAuth();
  }, []);

  // Gestion de l'authentification
  const handleAuth = async (isSignUp: boolean) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail();
      } else {
        await signInWithEmail();
      }
    } catch (error) {
      console.error('Erreur auth:', error);
      Alert.alert('Erreur', 'Impossible de se connecter. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Connexion par email/mot de passe
  const signInWithEmail = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      await auth().signInWithEmailAndPassword(email, password);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Erreur email:', error);
      let errorMessage = 'Impossible de se connecter. Veuillez réessayer.';
      if (error instanceof Error) {
        if (error.message.includes('auth/user-not-found')) {
          errorMessage = 'Aucun compte trouvé avec cet email.';
        } else if (error.message.includes('auth/wrong-password')) {
          errorMessage = 'Mot de passe incorrect.';
        }
      }
      Alert.alert('Erreur', errorMessage);
    }
  };

  // Inscription
  const signUpWithEmail = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({
        displayName: email.split('@')[0]
      });
      navigation.navigate('Home');
    } catch (error) {
      console.error('Erreur création:', error);
      let errorMessage = 'Impossible de créer le compte. Veuillez réessayer.';
      if (error instanceof Error) {
        if (error.message.includes('auth/email-already-in-use')) {
          errorMessage = 'Cet email est déjà utilisé.';
        } else if (error.message.includes('auth/invalid-email')) {
          errorMessage = 'Email invalide.';
        }
      }
      Alert.alert('Erreur', errorMessage);
    }
  };

  // Basculer entre inscription et connexion
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  // Connexion avec Google
  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const response = await GoogleSignin.signIn() as SignInResponse & { idToken: string };
      const credential = GoogleAuthProvider.credential(response.idToken);
      await auth().signInWithCredential(credential);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Erreur Google Sign-In:', error);
      Alert.alert('Erreur', 'Impossible de se connecter avec Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Background Image with Overlay */}
      <Image 
        source={require('../../assets/images/intrance.png')} 
        style={styles.backgroundImage}
        blurRadius={5}
      />
      <View style={styles.overlay} />
      
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Logo and App Title */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Icon name="person" size={40} color="#fff" />
            </View>
            <Text style={styles.appTitle}>{isSignUp ? 'Create your account' : 'Log In'}</Text>
          </View>
          
          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity 
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isSignUp && (
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity 
                    style={styles.showPasswordButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.showPasswordText}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => handleAuth(isSignUp)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Sign Up' : 'Log In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleAuthMode}
            >
              <Text style={styles.toggleButtonText}>
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>

            {!isSignUp && (
              <View style={styles.googleButtonContainer}>
                <TouchableOpacity 
                  style={styles.customGoogleButton}
                  onPress={signInWithGoogle}
                  disabled={isLoading}
                >
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {isSignUp && (
              <Text style={styles.termsText}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AuthScreen;

