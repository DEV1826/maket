// Moi.tsx - Profile and Settings Screen
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  Image, 
  ScrollView, 
  StatusBar,
  SafeAreaView
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const Moi = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('Utilisateur');
  const [userEmail, setUserEmail] = useState('');
  
  useEffect(() => {
    // Fetch user data from Firebase
    const fetchUserData = async () => {
      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          setUserEmail(currentUser.email || '');
          
          // Try to get display name from Firestore
          try {
            const userDoc = await firestore()
              .collection('users')
              .doc(currentUser.uid)
              .get();
              
            if (userDoc.exists() && userDoc.data()?.name) {
              setUserName(userDoc.data()?.name);
            } else if (currentUser.displayName) {
              setUserName(currentUser.displayName);
            }
          } catch (firestoreError) {
            console.log('Error fetching user profile from Firestore');
            if (currentUser.displayName) {
              setUserName(currentUser.displayName);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };
  
  const handleEditProfile = () => {
    // Navigate to profile edit screen
    navigation.navigate('Moi'); // Currently just refreshes this screen
  };
  
  const handleAccountSettings = () => {
    // Navigate to account settings
    navigation.navigate('Moi'); // Currently just refreshes this screen
  };
  
  const handlePrivacySettings = () => {
    // Navigate to privacy settings
    Alert.alert('Confidentialité', 'Paramètres de confidentialité');
  };
  
  const handleHelp = () => {
    // Navigate to help and assistance
    Alert.alert('Aide', 'Centre d\'assistance MBOA');
  };
  
  const handleFamily = () => {
    // Navigate to family management
    navigation.navigate('Foyer');
  };
  
  const handleNearbyMarkets = () => {
    // Navigate to nearby markets
    navigation.navigate('NearbyMarkets');
  };
  
  const handleBudget = () => {
    // Navigate to budget management
    navigation.navigate('BudgetManagement');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a2d5a" barStyle="light-content" />
      

      
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#f57c00" />
        </TouchableOpacity>
        
        <View style={styles.profileInfo}>
          <View style={styles.profileImageContainer}>
            <Text style={styles.profileInitials}>{userName.charAt(0)}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userPhone}>{userEmail || '+237 XXXXXXXX'}</Text>
        </View>
      </View>
      
      <ScrollView style={styles.menuContainer}>
        {/* Profile options */}
        <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
          <Icon name="person-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Profil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleFamily}>
          <Icon name="people-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Ma Famille</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleNearbyMarkets}>
          <Icon name="location-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Marchés à proximité</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleBudget}>
          <Icon name="wallet-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Mon Budget</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Historique')}>
          <Icon name="time-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Historique</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handlePrivacySettings}>
          <Icon name="lock-closed-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Confidentialité</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
          <Icon name="help-circle-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Aide et assistance</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleAccountSettings}>
          <Icon name="settings-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Paramètres</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Icon name="log-out-outline" size={22} color="#f57c00" style={styles.menuIcon} />
          <Text style={styles.menuItemText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17212b',
  },

  profileHeader: {
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#253340',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 20,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f57c00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#f57c00',
    opacity: 0.9,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  menuIcon: {
    marginRight: 32,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '400',
  },
});

export default Moi;