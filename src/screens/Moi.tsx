// Moi.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

const Moi = () => {
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.replace('Auth');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon Compte</Text>
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Moi;