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
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import RadioForm, { RadioButton, RadioButtonInput, RadioButtonLabel } from 'react-native-simple-radio-button';

interface MembreFoyer {
  id: string;
  nom: string;
  age?: number;
  preferences?: string;
  sexe?: string;
  position?: string;
}

const FoyerScreen: React.FC = () => {
  const [membres, setMembres] = useState<MembreFoyer[]>([]);
  const [nom, setNom] = useState('');
  const [age, setAge] = useState('');
  const [preferences, setPreferences] = useState('');
  const [sexe, setSexe] = useState<string | undefined>(undefined);
  const [position, setPosition] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MembreFoyer | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const sexeOptions = [
    { label: 'Homme', value: 'Homme' },
    { label: 'Femme', value: 'Femme' },
  ];

  const positionOptions = [
    { label: 'Père', value: 'Père' },
    { label: 'Mère', value: 'Mère' },
    { label: 'Enfant', value: 'Enfant' },
    { label: 'Cousin', value: 'Cousin' },
    { label: 'Autre', value: 'Autre' },
  ];

  useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Erreur', 'Non connecté.');
      setLoading(false);
      return;
    }

    const subscriber = firestore()
      .collection('users')
      .doc(userId)
      .collection('foyer_membres')
      .orderBy('nom', 'asc')
      .onSnapshot(
        querySnapshot => {
          const loaded: MembreFoyer[] = [];
          querySnapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() } as MembreFoyer));
          setMembres(loaded);
          setLoading(false);
        },
        () => {
          Alert.alert('Erreur', 'Problème de connexion.');
          setLoading(false);
        }
      );

    return () => subscriber();
  }, []);

  const handleAddOrUpdate = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId || !nom.trim()) {
      Alert.alert('Erreur', nom.trim() ? 'Non connecté.' : 'Nom requis.');
      return;
    }

    setAdding(true);
    try {
      const data: Partial<MembreFoyer> = {
        nom: nom.trim(),
        age: age ? parseInt(age, 10) : undefined,
        preferences: preferences.trim() || undefined,
        sexe: sexe || undefined,
        position: position || undefined,
      };

      if (editing) {
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('foyer_membres')
          .doc(editing.id)
          .update(data);
        Alert.alert('Succès', 'Membre modifié !');
      } else {
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('foyer_membres')
          .add(data);
        Alert.alert('Succès', 'Membre ajouté !');
      }

      reset();
    } catch (error: any) {
      Alert.alert('Erreur', `Échec: ${error.message}`);
    } finally {
      setAdding(false);
    }
  };

  const reset = () => {
    setNom('');
    setAge('');
    setPreferences('');
    setSexe(undefined);
    setPosition(undefined);
    setEditing(null);
    setModalVisible(false);
  };

  const handleEdit = (membre: MembreFoyer) => {
    setEditing(membre);
    setNom(membre.nom);
    setAge(membre.age ? membre.age.toString() : '');
    setPreferences(membre.preferences || '');
    setSexe(membre.sexe || undefined);
    setPosition(membre.position || undefined);
    setModalVisible(true);
  };

  const handleDelete = (id: string, nom: string) => {
    Alert.alert(
      'Confirmer',
      `Supprimer ${nom} ?`,
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui', style: 'destructive', onPress: () => {
          const userId = auth().currentUser?.uid;
          if (!userId) {
            Alert.alert('Erreur', 'Non connecté.');
            return;
          }
          try {
            firestore()
              .collection('users')
              .doc(userId)
              .collection('foyer_membres')
              .doc(id)
              .delete();
            if (editing?.id === id) reset();
            Alert.alert('Succès', `${nom} supprimé.`);
          } catch (error: any) {
            Alert.alert('Erreur', 'Échec de suppression.');
          }
        }},
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        <Path
          d="M20 50 Q 100 20, 200 50 T 380 50 T 560 50"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
        />
        <Path
          d="M20 550 Q 100 580, 200 550 T 380 550 T 560 550"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
        />
      </Svg>
      <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Mon foyer</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        {membres.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun membre.</Text>
            <Text style={styles.emptyText}>Ajoutez via le bouton !</Text>
          </View>
        ) : (
          <FlatList
            data={membres}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.memberInfo}>
                  <View style={styles.iconCircle}>
                    <Icon name="person" size={30} color="#fff" />
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{item.nom}</Text>
                    {item.sexe && <Text style={styles.infoText}>Sexe: {item.sexe}</Text>}
                    {item.position && <Text style={styles.infoText}>Position: {item.position}</Text>}
                    {item.preferences && (
                      <Text style={styles.preferences}>Préférences : {item.preferences}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
                    <Icon name="create-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.nom)} style={styles.deleteButton}>
                    <Icon name="trash-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={reset}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>{editing ? 'Modifier' : 'Ajouter'} un membre</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Nom (ex. Jean)"
                  placeholderTextColor="#666"
                  value={nom}
                  onChangeText={setNom}
                />
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Âge (ex. 35)"
                  placeholderTextColor="#666"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Préférences (ex. arachides)"
                  placeholderTextColor="#666"
                  value={preferences}
                  onChangeText={setPreferences}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sexe :</Text>
                <RadioForm formHorizontal={false} animation={true}>
                  {sexeOptions.map((obj, i) => (
                    <RadioButton labelHorizontal={true} key={i}>
                      <RadioButtonInput
                        obj={obj}
                        index={i}
                        isSelected={sexe === obj.value}
                        onPress={(value) => setSexe(value)}
                        borderWidth={1}
                        buttonInnerColor={'#ff6200'}
                        buttonOuterColor={sexe === obj.value ? '#ff6200' : '#000'}
                        buttonSize={10}
                        buttonOuterSize={20}
                        buttonStyle={{}}
                      />
                      <RadioButtonLabel
                        obj={obj}
                        index={i}
                        labelHorizontal={true}
                        onPress={(value) => setSexe(value)}
                        labelStyle={{ fontSize: 16, color: '#333' }}
                        labelWrapStyle={{}}
                      />
                    </RadioButton>
                  ))}
                </RadioForm>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Position :</Text>
                <RadioForm formHorizontal={false} animation={true}>
                  {positionOptions.map((obj, i) => (
                    <RadioButton labelHorizontal={true} key={i}>
                      <RadioButtonInput
                        obj={obj}
                        index={i}
                        isSelected={position === obj.value}
                        onPress={(value) => setPosition(value)}
                        borderWidth={1}
                        buttonInnerColor={'#ff6200'}
                        buttonOuterColor={position === obj.value ? '#ff6200' : '#000'}
                        buttonSize={10}
                        buttonOuterSize={20}
                        buttonStyle={{}}
                      />
                      <RadioButtonLabel
                        obj={obj}
                        index={i}
                        labelHorizontal={true}
                        onPress={(value) => setPosition(value)}
                        labelStyle={{ fontSize: 16, color: '#333' }}
                        labelWrapStyle={{}}
                      />
                    </RadioButton>
                  ))}
                </RadioForm>
              </View>
              <TouchableOpacity
                style={[styles.button, adding && styles.buttonDisabled]}
                onPress={handleAddOrUpdate}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="person-add-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>{editing ? 'Modifier' : 'Ajouter'}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={reset}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 10,
  },
  scroll: { padding: 16, paddingBottom: 80 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff', marginTop: 10 },
  empty: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 8 },
  list: { paddingBottom: 80 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    elevation: 3,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff6200',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberDetails: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#000' },
  infoText: { fontSize: 14, color: '#666', marginTop: 2 },
  preferences: { fontSize: 14, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  editButton: {
    backgroundColor: '#ff6200',
    padding: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#ff6200',
    padding: 6,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#ff6200',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    maxHeight: '80%',
  },
  modalScroll: { paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 16, textAlign: 'center' },
  inputGroup: { marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  label: { fontSize: 16, color: '#333', marginBottom: 8 },
  button: {
    backgroundColor: '#ff6200',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#ffb386' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  cancelButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default FoyerScreen;