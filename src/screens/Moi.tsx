import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

const Moi = () => {
  const navigation = useNavigation();
  const user = auth().currentUser;
  const [theme, setTheme] = useState('light'); // Utiliser 'light' par défaut

  const handleLogout = () => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui', onPress: async () => {
          try {
            await auth().signOut();
            navigation.replace('Auth');
          } catch (error) {
            Alert.alert('Erreur', 'Déconnexion échouée : ' + error.message);
          }
        } },
      ],
      { cancelable: true }
    );
  };

  const handleSettings = () => {
    // Gérer les paramètres ici si nécessaire
  };

  return (
    <View style={styles.container}>
      <Image
        style={styles.headerImage}
        source={require('../../assets/images/logo.png')} // Remplacez par votre image de fond
      />
       <View style={styles.profileContainer}>
         <Image
           style={styles.profileImage}
           source={user?.photoURL ? { uri: user.photoURL } : require('../../assets/images/photo.png')}
         />
         <Text style={styles.userName}>{user?.displayName || 'Votre Nom'}</Text>
       </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity style={styles.editButton} onPress={() => {}}>
          <Text style={styles.editButtonText}>Modifier votre profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accountButton} onPress={() => {}}>
          <Text style={styles.accountButtonText}>Gérer votre compte</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
          <Text style={styles.settingsText}>Paramètres de confidentialité</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpButton} onPress={() => {}}>
          <Text style={styles.helpText}>Aide et assistance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
  },
  headerImage: {
    width: '100%',
    height: 200,
    position: 'absolute',
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
    //paddingTop: 100, // Pour éviter que le contenu soit caché sous l'image d'en-tête
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 10, // Espacement entre le profil et le reste
    marginTop: 100,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ccc',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 10,
  },
  editButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#e7e7e7',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ff5722',
  },
  accountButton: {
    marginTop: 15, // Espacement amélioré
    padding: 10,
    backgroundColor: '#e7e7e7',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  accountButtonText: {
    color: '#ff5722',
  },
  settingsButton: {
    marginTop: 75, // Espacement amélioré
    padding: 10,
    backgroundColor: '#e7e7e7',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  settingsText: {
    color: '#ff5722',
  },
  helpButton: {
    marginTop: 15, // Espacement amélioré
    padding: 10,
    backgroundColor: '#e7e7e7',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  helpText: {
    color: '#ff5722',
  },
  logoutButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#dc3545',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  lightText: {
    color: '#333',
  },
});

export default Moi;