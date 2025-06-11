import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// Assurez-vous que CE CHEMIN EST CORRECT pour votre projet
import countriesData from './data/countries.json'; // Ou '../../data/countries.json' selon votre structure

import allCitiesData from './data/all_cities.json';

// Importez les interfaces (assurez-vous que ce chemin est également correct)
import type { CountryDataItem, CityPickerItem } from './data/countries.d';

export default function App() { // Ou PlatsListScreen
  // --- États pour le sélecteur de Pays ---
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryValue, setCountryValue] = useState<string | null>(null);
  const [countryItems, setCountryItems] = useState<CountryDataItem[]>(
    [...countriesData].sort((a, b) => a.label.localeCompare(b.label))
  );

  // --- États pour le sélecteur de Villes ---
  const [cityOpen, setCityOpen] = useState(false);
  const [cityValue, setCityValue] = useState<string | null>(null);
  const [cityItems, setCityItems] = useState<CityPickerItem[]>([]);

  // Ajout du log ici pour voir la valeur initiale du pays (avant toute sélection)
  console.log('Initial countryValue:', countryValue);


  const getCountryLabelFromValue = useCallback((isoCode: string | null) => {
    if (!isoCode) return 'Aucun';
    const foundCountry = countriesData.find(c => c.value === isoCode);
    // Log pour voir quel nom de pays est trouvé
    console.log(`Searching for country ISO: ${isoCode}, Found label: ${foundCountry ? foundCountry.label : 'Not Found'}`);
    return foundCountry ? foundCountry.label : 'Non trouvé';
  }, []);

  // Fonction pour filtrer et préparer les villes en fonction du pays sélectionné
  const filterAndPrepareCities = useCallback((selectedCountryIsoCode: string | null) => {
    // Log pour voir le code ISO du pays sélectionné
    console.log('filterAndPrepareCities called with ISO:', selectedCountryIsoCode);

    const countryName = getCountryLabelFromValue(selectedCountryIsoCode);
    // Log pour voir le nom de pays obtenu après traduction
    console.log('Translated countryName for lookup:', countryName);

    let citiesForPicker: CityPickerItem[] = [];

    // Vérifier si countryName existe et s'il est une clé dans allCitiesData
    if (countryName && allCitiesData[countryName]) {
      // Log pour confirmer que des villes ont été trouvées pour ce nom de pays
      console.log(`Cities found in allCitiesData for "${countryName}":`, allCitiesData[countryName].length);
      const rawCities = allCitiesData[countryName];
      citiesForPicker = rawCities.map(cityName => ({
        label: cityName,
        value: cityName,
      }));
    } else {
      // Log si aucune ville n'a été trouvée, cela indique un problème de correspondance de nom
      console.log(`No cities found in allCitiesData for key "${countryName}" (or countryName is null).`);
      // Affiche les clés disponibles dans allCitiesData pour le débogage
      // console.log('Available keys in allCitiesData:', Object.keys(allCitiesData));
    }

    setCityItems(citiesForPicker);
    // Log pour voir les villes qui sont réellement passées au picker
    console.log('City items prepared for picker:', citiesForPicker);

    setCityValue(null);
  }, [getCountryLabelFromValue]);

  useEffect(() => {
    filterAndPrepareCities(countryValue);
    // Log pour voir quand countryValue change et déclenche l'effet
    console.log('useEffect: countryValue changed to', countryValue);
  }, [countryValue, filterAndPrepareCities]);


  const onCountryOpen = useCallback(() => {
    setCityOpen(false);
  }, []);

  const onCityOpen = useCallback(() => {
    setCountryOpen(false);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sélection de Pays et Ville</Text>

      {/* Sélecteur de Pays */}
      <Text style={styles.label}>Sélectionnez un pays :</Text>
      <DropDownPicker
        open={countryOpen}
        value={countryValue}
        items={countryItems}
        setOpen={setCountryOpen}
        setValue={setCountryValue}
        setItems={setCountryItems}
        onOpen={onCountryOpen}
        placeholder="Sélectionner un pays"
        searchable={true}
        searchPlaceholder="Rechercher un pays..."
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        zIndex={3000}
        zIndexInverse={1000}
      />

      {/* Sélecteur de Villes (activé seulement si un pays est sélectionné) */}
      {countryValue && (
        <View style={styles.cityPickerContainer}>
          <Text style={styles.label}>Sélectionnez une ville :</Text>
          <DropDownPicker
            open={cityOpen}
            value={cityValue}
            items={cityItems} // Ici, les items sont les villes filtrées
            setOpen={setCityOpen}
            setValue={setCityValue}
            setItems={setCityItems}
            onOpen={onCityOpen}
            placeholder={cityItems.length > 0 ? "Sélectionner une ville" : "Aucune ville disponible pour ce pays"}
            searchable={true} // <-- C'est bien ici, donc la recherche devrait être activée
            searchPlaceholder="Rechercher une ville..."
            disabled={!countryValue || cityItems.length === 0}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            zIndex={1000}
            zIndexInverse={3000}
          />
        </View>
      )}

      {/* Affichage des sélections */}
      <View style={styles.selectionDisplay}>
        <Text>Pays sélectionné (ISO) : {countryValue || 'Aucun'}</Text>
        <Text>Nom du pays : {getCountryLabelFromValue(countryValue)}</Text>
        <Text>Ville sélectionnée : {cityValue || 'Aucune'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 100,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    marginTop: 20,
  },
  dropdown: {
    backgroundColor: '#fafafa',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
  },
  dropdownContainer: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
  },
  cityPickerContainer: {
    marginTop: 20,
  },
  selectionDisplay: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
});