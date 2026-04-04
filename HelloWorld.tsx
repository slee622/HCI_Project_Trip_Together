import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HelloWorld: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
    </View>
  );
};

export default HelloWorld;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
});