// PlatsListScreen.tsx (Version simplifiée pour Pays et Villes seulement)

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import DropDownPicker from 'react-native-dropdown-picker';

// IMPORTS DES DONNÉES ET DES TYPES
// IMPORTANT : VÉRIFIEZ ET AJUSTEZ CES CHEMINS SELON LA STRUCTURE DE VOTRE PROJET !
// Par exemple: si PlatsListScreen.tsx est dans src/screens, et data est à la racine, utilisez '../../data/'
import ALL_COUNTRIES_DATA from '../../data/countries.json';

// Importation du fichier JSON brut
import ALL_CITIES_DATA_RAW from '../../data/all_cities.json';

// Importation des interfaces de type (incluant AllCitiesJson maintenant)
// IMPORTANT : VÉRIFIEZ ET AJUSTEZ CE CHEMIN ÉGALEMENT !
import type { CountryDataItem, CityPickerItem, AllCitiesJson } from '../../data/countries.d';

// Assertez explicitement le type de l'objet de données de villes
// Cela indique à TypeScript que cet objet peut être indexé par une chaîne (nom de pays)
const ALL_CITIES_DATA: AllCitiesJson = ALL_CITIES_DATA_RAW;


const PlatsListScreen: React.FC = () => {
  // --- États pour le sélecteur de Pays ---
  const [openCountryPicker, setOpenCountryPicker] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [countriesItems, setCountriesItems] = useState<CountryDataItem[]>(
    // Correction: Création d'une copie du tableau avant de le trier pour éviter l'erreur TypeScript
    [...ALL_COUNTRIES_DATA].sort((a, b) => a.label.localeCompare(b.label))
  );

  // --- États pour le sélecteur de Villes ---
  const [openCityPicker, setOpenCityPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  // Utilisation de CityPickerItem pour le typage des villes
  const [citiesItems, setCitiesItems] = useState<CityPickerItem[]>([]);


  // Fonction pour trouver le nom complet du pays à partir de son code ISO
  const getCountryLabelFromValue = useCallback((isoCode: string | null): string => {
    if (!isoCode) return 'Aucun';
    const foundCountry = ALL_COUNTRIES_DATA.find(c => c.value === isoCode);
    return foundCountry ? foundCountry.label : 'Non trouvé';
  }, []);

  // Fonction pour filtrer et préparer les villes en fonction du pays sélectionné
  const filterAndPrepareCities = useCallback((countryIsoCode: string | null) => {
    // 1. Obtenir le nom complet du pays à partir de son code ISO
    const countryName = getCountryLabelFromValue(countryIsoCode);
    let preparedCities: CityPickerItem[] = [];

    // Ici, ALL_CITIES_DATA est maintenant typé comme AllCitiesJson,
    // ce qui permet l'indexation avec `countryName`
    const citiesForCountry = ALL_CITIES_DATA[countryName];

    // 2. Vérifie si le nom du pays existe ET si la valeur associée est bien un tableau de chaînes
    if (countryName && Array.isArray(citiesForCountry)) {
      // citiesForCountry est déjà de type string[] ou undefined (si non trouvé),
      // donc on peut le mapper directement s'il est un tableau.
      preparedCities = citiesForCountry.map((cityName: string) => ({
        label: cityName,
        value: cityName, // La valeur de la ville sera son propre nom
      }));
    } else {
      // Pour le débogage si un pays ne trouve pas ses villes ou si la structure est incorrecte
      console.log(`Debug: Aucune ville trouvée ou la structure des données est incorrecte pour le pays "${countryName}".`);
      console.log('Clés disponibles dans ALL_CITIES_DATA:', Object.keys(ALL_CITIES_DATA));
    }

    setCitiesItems(preparedCities); 
    setSelectedCity(null); 
  }, [getCountryLabelFromValue]);
  useEffect(() => {
    filterAndPrepareCities(selectedCountryCode);
  }, [selectedCountryCode, filterAndPrepareCities]);
  const onCountryOpen = useCallback(() => {
    setOpenCityPicker(false); // Ferme le picker de villes si le picker de pays s'ouvre
  }, []);

  const onCityOpen = useCallback(() => {
    setOpenCountryPicker(false); // Ferme le picker de pays si le picker de villes s'ouvre
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.filtreContainer, { zIndex: 1000 }]}>
        <Text style={styles.filtreLabel}>Sélectionnez votre localisation</Text>

        {/* DropDownPicker pour les pays */}
        <DropDownPicker
          open={openCountryPicker}
          value={selectedCountryCode}
          items={countriesItems} // countriesItems est déjà typé et formaté correctement
          setOpen={setOpenCountryPicker}
          setValue={setSelectedCountryCode}
          setItems={setCountriesItems as any} // Cast 'any' pour la compatibilité avec DropDownPicker
          placeholder="Sélectionner un pays"
          searchable={true}
          searchPlaceholder="Rechercher un pays..."
          containerStyle={styles.dropdownContainer}
          style={styles.dropdownStyle}
          labelStyle={styles.dropdownLabel}
          placeholderStyle={styles.dropdownPlaceholder}
          listItemLabelStyle={styles.dropdownListItemLabel}
          selectedItemLabelStyle={styles.dropdownSelectedItemLabel}
          zIndex={3000} // Priorité élevée pour que le pays s'affiche au-dessus
          onOpen={onCountryOpen} // Utilise le callback
        />

        {/* DropDownPicker pour les villes (affiché seulement si un pays est sélectionné) */}
        {selectedCountryCode && (
          <DropDownPicker
            open={openCityPicker}
            value={selectedCity}
            items={citiesItems} // Villes filtrées sont déjà au bon format
            setOpen={setOpenCityPicker}
            setValue={setSelectedCity}
            setItems={setCitiesItems} // Maintenu pour la compatibilité avec DropDownPicker
            placeholder="Sélectionner une ville"
            searchable={true}
            searchPlaceholder="Rechercher une ville..."
            containerStyle={[styles.dropdownContainer, { marginTop: 10 }]}
            style={styles.dropdownStyle}
            labelStyle={styles.dropdownLabel}
            placeholderStyle={styles.dropdownPlaceholder}
            listItemLabelStyle={styles.dropdownListItemLabel}
            selectedItemLabelStyle={styles.dropdownSelectedItemLabel}
            zIndex={2000} // Priorité plus basse que le pays
            onOpen={onCityOpen} // Utilise le callback
            // Désactivé si aucune ville n'est disponible pour le pays sélectionné
            disabled={citiesItems.length === 0}
            ListEmptyComponent={() => (
              <Text style={styles.emptyDropdownText}>Aucune ville trouvée pour ce pays.</Text>
            )}
          />
        )}
      </View>

      {/* Affichage des sélections actuelles (pour le débogage/vérification) */}
      <View style={styles.selectionDisplay}>
        <Text style={styles.selectionText}>
          Pays sélectionné (code ISO) : {selectedCountryCode || 'Aucun'}
        </Text>
        <Text style={styles.selectionText}>
          Nom du pays : {getCountryLabelFromValue(selectedCountryCode)}
        </Text>
        <Text style={styles.selectionText}>
          Ville sélectionnée : {selectedCity || 'Aucune'}
        </Text>
      </View>
    </View>
  );
};

// Exporte le composant
export default PlatsListScreen;

// Styles pour votre composant
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff',
    padding: 20, 
    paddingTop: 80, 
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
  dropdownContainer: {
    height: 50,
    marginBottom: 15, // Ajout d'espace entre les dropdowns
  },
  dropdownStyle: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
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
  dropdownSelectedItemLabel: {
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
    backgroundColor: '#e0f7fa', // Couleur de fond douce
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b2ebf2',
  },
  selectionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
});