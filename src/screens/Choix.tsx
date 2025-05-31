// NewScreen.js
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const Choix = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Ceci est la nouvelle page!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
  },
});

export default Choix;