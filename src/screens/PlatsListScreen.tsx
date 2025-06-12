// PlatsListScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, FlatList, Image, ActivityIndicator, Alert, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import ALL_COUNTRIES_DATA from '../../data/countries.json';
import ALL_CITIES_DATA_RAW from '../../data/all_cities.json';

import type { CountryDataItem, CityPickerItem, AllCitiesJson } from '../../data/countries.d';

// Assertez explicitement le type de l'objet de données de villes pour TypeScript
const ALL_CITIES_DATA: AllCitiesJson = ALL_CITIES_DATA_RAW;

type RootStackParamList = {
  PlatsList: undefined;
  AddPlat: { platId?: string };
  PlatDetail: { platId: string };
};

type PlatsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlatsList'>;

const windowHeight = Dimensions.get('window').height;
interface MealDbDish {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string;
  strArea?: string; // Origine/Cuisine du plat
}

const countryToAreaMap: { [key: string]: string } = {
  "US": "American",
  "GB": "British",
  "CA": "Canadian",
  "CN": "Chinese",
  "HR": "Croatian",
  "EG": "Egyptian",
  "FR": "French",
  "DE": "German",
  "GR": "Greek",
  "IN": "Indian",
  "IE": "Irish",
  "IT": "Italian",
  "JM": "Jamaican",
  "JP": "Japanese",
  "MY": "Malaysian",
  "MX": "Mexican",
  "MA": "Moroccan",
  "PL": "Polish",
  "PT": "Portuguese",
  "RU": "Russian",
  "ES": "Spanish",
  "TH": "Thai",
  "TN": "Tunisian",
  "TR": "Turkish",
  "VN": "Vietnamese",
  "SY": "Syrian",
  "PH": "Filipino", 
  "NL": "Dutch", 
  "PK": "Pakistani", 
  "BD": "Bengali",
};

const getAreaFromCountryCode = (countryCode: string | null): string | null => {
  return countryCode ? countryToAreaMap[countryCode] || null : null;
};


const PlatsListScreen: React.FC = () => {
  const navigation = useNavigation<PlatsListScreenNavigationProp>();

  // --- États pour le sélecteur de Pays ---
  const [openCountryPicker, setOpenCountryPicker] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [countriesItems, setCountriesItems] = useState<CountryDataItem[]>(
    [...ALL_COUNTRIES_DATA].sort((a, b) => a.label.localeCompare(b.label))
  );
  const [openCityPicker, setOpenCityPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [citiesItems, setCitiesItems] = useState<CityPickerItem[]>([]);
  const [platSearchTerm, setPlatSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const [openAreaPicker, setOpenAreaPicker] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaItems, setAreaItems] = useState<{ label: string; value: string }[]>([]);
  const [areaLoading, setAreaLoading] = useState(false); 

  const [displayedDishes, setDisplayedDishes] = useState<MealDbDish[]>([]);

  const getCountryLabelFromValue = useCallback((isoCode: string | null): string => {
    if (!isoCode) return 'Aucun';
    const foundCountry = ALL_COUNTRIES_DATA.find(c => c.value === isoCode);
    return foundCountry ? foundCountry.label : 'Non trouvé';
  }, []);

  const filterAndPrepareCities = useCallback((countryIsoCode: string | null) => {
    const countryName = getCountryLabelFromValue(countryIsoCode);
    let preparedCities: CityPickerItem[] = [];

    const citiesForCountry = ALL_CITIES_DATA[countryName];

    if (countryName && Array.isArray(citiesForCountry)) {
      preparedCities = citiesForCountry.map((cityName: string) => ({
        label: cityName,
        value: cityName,
      }));
    } else {
      console.log(`Debug: Aucune ville trouvée ou la structure des données est incorrecte pour le pays "${countryName}".`);
      console.log('Clés disponibles dans ALL_CITIES_DATA:', Object.keys(ALL_CITIES_DATA));
    }

    setCitiesItems(preparedCities);
  }, [getCountryLabelFromValue]);

  // Fonction pour charger toutes les Areas depuis TheMealDB (au montage du composant)
  const fetchAreas = useCallback(async () => {
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list');
      const data = await response.json();
      if (data.meals) {
        const areas = data.meals.map((area: { strArea: string }) => ({
          label: area.strArea,
          value: area.strArea,
        }));
        setAreaItems(areas.sort((a: { label: string; }, b: { label: any; }) => a.label.localeCompare(b.label))); // Trie les zones
      }
    } catch (error) {
      console.error("Erreur lors du chargement des zones:", error);
      Alert.alert('Erreur API', 'Impossible de charger les listes de cuisines.');
    }
  }, []);

  // Fonction pour rechercher des plats par nom via TheMealDB API
  const searchDishesByName = useCallback(async () => {
    if (!platSearchTerm.trim()) {
      Alert.alert('Information', 'Veuillez entrer un nom de plat à rechercher.');
      setDisplayedDishes([]);
      return;
    }

    setSearchLoading(true); // Active l'indicateur de chargement
    setSelectedArea(null); // Désélectionne l'Area si une recherche par nom est lancée

    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(platSearchTerm)}`);
      const data = await response.json();

      if (data.meals) {
        setDisplayedDishes(data.meals);
        console.log('Plats trouvés par recherche de nom:', data.meals);
      } else {
        setDisplayedDishes([]);
        Alert.alert('Information', `Aucun plat trouvé pour "${platSearchTerm}".`);
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de plats par nom:", error);
      Alert.alert('Erreur', 'Impossible de rechercher les plats. Vérifiez votre connexion.');
    } finally {
      setSearchLoading(false); // Désactive l'indicateur de chargement
    }
  }, [platSearchTerm]);

  // Fonction pour rechercher des plats par Area via TheMealDB API
  const fetchDishesByArea = useCallback(async (area: string | null) => {
    if (!area) {
      setDisplayedDishes([]);
      return;
    }

    setAreaLoading(true); 
    setPlatSearchTerm(''); 

    try {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`);
      const data = await response.json();

      if (data.meals) {
        setDisplayedDishes(data.meals);
        console.log(`Plats trouvés pour la zone "${area}":`, data.meals);
      } else {
        setDisplayedDishes([]);
        Alert.alert('Information', `Aucun plat trouvé pour la zone "${area}".`);
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de plats par area:", error);
      Alert.alert('Erreur', 'Impossible de charger les plats par zone. Vérifiez votre connexion.');
    } finally {
      setAreaLoading(false); // Désactive l'indicateur de chargement
    }
  }, []);

  // --- Effets d'initialisation et de gestion des changements ---

  // Effet au montage pour charger toutes les Areas disponibles
  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  useEffect(() => {
    filterAndPrepareCities(selectedCountryCode);
    setSelectedArea(null);
    setPlatSearchTerm('');
    setDisplayedDishes([]);
  }, [selectedCountryCode, filterAndPrepareCities]);

  useEffect(() => {
    // Si un pays ET une ville sont sélectionnés
    if (selectedCountryCode && selectedCity) {
      const suggestedArea = getAreaFromCountryCode(selectedCountryCode);
      if (suggestedArea) {
        setSelectedArea(suggestedArea);
        console.log(`Suggestion de cuisine automatique pour ${getCountryLabelFromValue(selectedCountryCode)}: ${suggestedArea}`);
      } else {
        setSelectedArea(null);
        setDisplayedDishes([]);
        console.log(`Aucune cuisine suggérée via mapping pour ${getCountryLabelFromValue(selectedCountryCode)}.`);
      }
    } else if (!selectedCountryCode && !selectedCity) {
      setSelectedArea(null);
      setDisplayedDishes([]);
    }
  }, [selectedCountryCode, selectedCity, getCountryLabelFromValue]); // Dépend de 
  useEffect(() => {
    if (selectedArea && !platSearchTerm.trim()) { 
      fetchDishesByArea(selectedArea);
    } else if (!selectedArea && !platSearchTerm.trim()) {
      setDisplayedDishes([]);
    }
  }, [selectedArea, fetchDishesByArea, platSearchTerm]);


  const onCountryOpen = useCallback(() => {
    setOpenCityPicker(false);
    setOpenAreaPicker(false); // Ferme aussi le picker d'Area
  }, []);

  const onCityOpen = useCallback(() => {
    setOpenCountryPicker(false);
    setOpenAreaPicker(false); // Ferme aussi le picker d'Area
  }, []);

  const onAreaOpen = useCallback(() => {
    setOpenCountryPicker(false);
    setOpenCityPicker(false); // Ferme aussi le picker de ville
  }, []);

  const renderDishItem = useCallback(({ item }: { item: MealDbDish }) => (
    <View style={styles.dishResultCard}>
      <View style={styles.dishInfo}>
        <Text style={styles.dishName}>{item.strMeal}</Text>
        {item.strCategory && <Text style={styles.dishCategory}>Catégorie: {item.strCategory}</Text>}
        {item.strArea && <Text style={styles.dishArea}>Origine: {item.strArea}</Text>}
      </View>
      {item.strMealThumb && (
        <Image source={{ uri: item.strMealThumb }} style={styles.dishImage} />
      )}
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), []);
  interface ComponentStyles {
    container: ViewStyle;
    addPlatButton: ViewStyle;
    addPlatButtonText: TextStyle;
    filtreContainer: ViewStyle;
    filtreLabel: TextStyle;
    dropdownPickerWrapper: ViewStyle;
    dropdownStyle: ViewStyle;
    dropdownListContainer: ViewStyle;
    dropdownLabel: TextStyle;
    dropdownPlaceholder: TextStyle;
    dropdownListItemLabel: TextStyle;
    selectedItemLabelStyle: TextStyle;
    emptyDropdownText: TextStyle;
    selectionDisplay: ViewStyle;
    selectionText: TextStyle;
    platSearchContainer: ViewStyle;
    platSearchInput: TextStyle;
    searchPlatButton: ViewStyle;
    searchPlatButtonText: TextStyle;
    dishListContent: ViewStyle;
    dishResultCard: ViewStyle;
    dishInfo: ViewStyle;
    dishName: TextStyle;
    dishCategory: TextStyle;
    dishArea: TextStyle;
    dishImage: ImageStyle;
    loadingContainer: ViewStyle;
    emptyListContainer: ViewStyle;
    suggestedCuisineText: TextStyle;
  }

  const styles = StyleSheet.create<ComponentStyles>({
    container: {
      flex: 1,
      backgroundColor: '#f5fcff',
      padding: 20,
      paddingTop: 80,
    },
    addPlatButton: {
      backgroundColor: 'green',
      padding: 15,
      borderRadius: 10,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    addPlatButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    filtreContainer: {
      marginBottom: 20,
    },
    filtreLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#333',
      textAlign: 'center',
    },
    dropdownPickerWrapper: {
      height: 50,
      marginBottom: 15,
      minHeight: 50,
    },
    dropdownStyle: {
      backgroundColor: '#fff',
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 2,
    },
    dropdownListContainer: {
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 8,
      maxHeight: windowHeight * 0.4,
      backgroundColor: '#fff',
    },
    dropdownLabel: {
      fontSize: 16,
      color: '#333',
    },
    dropdownPlaceholder: {
      color: '#999',
    },
    dropdownListItemLabel: {
      fontSize: 16,
      color: '#333',
    },
    selectedItemLabelStyle: {
      fontWeight: 'bold',
      color: 'green',
    },
    emptyDropdownText: {
      textAlign: 'center',
      padding: 10,
      color: '#888',
      fontSize: 14,
    },
    selectionDisplay: {
      marginTop: 30,
      padding: 15,
      backgroundColor: '#e0f7fa',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#b2ebf2',
      zIndex: 0,
    },
    selectionText: {
      fontSize: 16,
      color: '#333',
      marginBottom: 5,
    },
    platSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 20,
      // ZIndex élevé pour être au-dessus des autres pickers
      zIndex: 10,
    },
    platSearchInput: {
      flex: 1,
      height: 50,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 15,
      fontSize: 16,
      backgroundColor: 'white',
      marginRight: 10,
    },
    searchPlatButton: {
      backgroundColor: '#007bff',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    searchPlatButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    dishListContent: {
      paddingBottom: 20,
    },
    dishResultCard: {
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    dishInfo: {
      flex: 1,
      marginRight: 10,
    },
    dishName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
      color: '#333',
    },
    dishCategory: {
      fontSize: 14,
      color: '#666',
      marginBottom: 3,
    },
    dishArea: {
      fontSize: 14,
      color: '#666',
      marginBottom: 5,
    },
    dishImage: {
      width: 90,
      height: 90,
      borderRadius: 8,
      resizeMode: 'cover',
      marginLeft: 10,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 40,
    },
    suggestedCuisineText: {
      fontSize: 14,
      color: '#007bff',
      textAlign: 'center',
      marginTop: 10,
      fontStyle: 'italic',
    }
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addPlatButton}
        // MODIFICATION ICI : Passe un objet avec le nom de la route et les paramètres optionnels.
        onPress={() => navigation.navigate('AddPlat', { platId: undefined })}
      >
        <Icon name="add-circle-outline" size={24} color="white" />
        <Text style={styles.addPlatButtonText}>Ajouter un Plat</Text>
      </TouchableOpacity>

      <View style={styles.filtreContainer}>
        <Text style={styles.filtreLabel}>Filtrer les Plats</Text>

        {/* Sélecteur de Pays */}
        <View style={[styles.dropdownPickerWrapper, { zIndex: openCountryPicker ? 3000 : 1 }]}>
          <DropDownPicker
            open={openCountryPicker}
            value={selectedCountryCode}
            items={countriesItems}
            setOpen={setOpenCountryPicker}
            setValue={setSelectedCountryCode}
            setItems={setCountriesItems}
            placeholder="Sélectionner un pays"
            containerStyle={styles.dropdownPickerWrapper}
            style={styles.dropdownStyle}
            dropDownContainerStyle={styles.dropdownListContainer}
            textStyle={styles.dropdownLabel}
            placeholderStyle={styles.dropdownPlaceholder}
            labelStyle={styles.dropdownListItemLabel}
            selectedItemLabelStyle={styles.selectedItemLabelStyle}
            listMode="SCROLLVIEW"
            onOpen={onCountryOpen}
            searchable={true}
            searchPlaceholder="Rechercher un pays..."
            maxHeight={windowHeight * 0.4}
            ListEmptyComponent={() => (
              <Text style={styles.emptyDropdownText}>Aucun pays trouvé</Text>
            )}
          />
        </View>

        {/* Sélecteur de Villes (activé seulement si un pays est sélectionné et des villes existent) */}
        {selectedCountryCode && citiesItems.length > 0 && (
          <View style={[styles.dropdownPickerWrapper, { zIndex: openCityPicker ? 2000 : 1 }]}>
            <DropDownPicker
              open={openCityPicker}
              value={selectedCity}
              items={citiesItems}
              setOpen={setOpenCityPicker}
              setValue={setSelectedCity}
              setItems={setCitiesItems}
              placeholder="Sélectionner une ville"
              containerStyle={styles.dropdownPickerWrapper}
              style={styles.dropdownStyle}
              dropDownContainerStyle={styles.dropdownListContainer}
              textStyle={styles.dropdownLabel}
              placeholderStyle={styles.dropdownPlaceholder}
              labelStyle={styles.dropdownListItemLabel}
              selectedItemLabelStyle={styles.selectedItemLabelStyle}
              listMode="SCROLLVIEW"
              onOpen={onCityOpen}
              searchable={true}
              searchPlaceholder="Rechercher une ville..."
              maxHeight={windowHeight * 0.4}
              ListEmptyComponent={() => (
                <Text style={styles.emptyDropdownText}>Aucune ville trouvée pour ce pays</Text>
              )}
              disabled={!selectedCountryCode || citiesItems.length === 0}
            />
          </View>
        )}

        {/* Sélecteur de Zone Culinaires (Area) */}
        <View style={[styles.dropdownPickerWrapper, { zIndex: openAreaPicker ? 1000 : 1 }]}>
          <DropDownPicker
            open={openAreaPicker}
            value={selectedArea}
            items={areaItems}
            setOpen={setOpenAreaPicker}
            setValue={(callback) => {
              setSelectedArea(callback);
              setPlatSearchTerm('');
            }}
            setItems={setAreaItems}
            placeholder="Sélectionner une cuisine (Area)"
            containerStyle={styles.dropdownPickerWrapper}
            style={styles.dropdownStyle}
            dropDownContainerStyle={styles.dropdownListContainer}
            textStyle={styles.dropdownLabel}
            placeholderStyle={styles.dropdownPlaceholder}
            labelStyle={styles.dropdownListItemLabel}
            selectedItemLabelStyle={styles.selectedItemLabelStyle}
            listMode="SCROLLVIEW"
            onOpen={onAreaOpen}
            searchable={true}
            searchPlaceholder="Rechercher une cuisine..."
            maxHeight={windowHeight * 0.4}
            ListEmptyComponent={() => (
              <Text style={styles.emptyDropdownText}>Aucune cuisine trouvée</Text>
            )}
          />
        </View>

        {selectedCountryCode && selectedCity && !selectedArea && getAreaFromCountryCode(selectedCountryCode) && (
          <Text style={styles.suggestedCuisineText}>
            Aucune cuisine TheMealDB trouvée pour "{getCountryLabelFromValue(selectedCountryCode)}".
            Veuillez sélectionner manuellement si vous le souhaitez.
          </Text>
        )}

      </View>

      <View style={styles.platSearchContainer}>
        <TextInput
          style={styles.platSearchInput}
          placeholder="Rechercher un plat par nom..."
          value={platSearchTerm}
          onChangeText={setPlatSearchTerm}
          onSubmitEditing={searchDishesByName}
        />
        <TouchableOpacity style={styles.searchPlatButton} onPress={searchDishesByName}>
          <Text style={styles.searchPlatButtonText}>Rechercher</Text>
        </TouchableOpacity>
      </View>

      {(searchLoading || areaLoading) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Chargement des plats...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedDishes}
          keyExtractor={(item) => item.idMeal}
          renderItem={renderDishItem}
          contentContainerStyle={styles.dishListContent}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyDropdownText}>
                {selectedArea || platSearchTerm
                  ? "Aucun plat trouvé pour votre sélection ou recherche."
                  : "Sélectionnez un pays/ville ou recherchez un plat."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default PlatsListScreen;
