import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Index() {
  const [result, setResult] = useState<string>('Connecting...');

  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from('drivers').select('*');

      if (error) {
        setResult(`❌ ERROR: ${error.message}`);
      } else {
        setResult(`✅ Connected! Drivers count: ${data.length}`);
      }
    };

    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Connection Test</Text>
      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  result: {
    fontSize: 16,
    textAlign: 'center',
  },
});