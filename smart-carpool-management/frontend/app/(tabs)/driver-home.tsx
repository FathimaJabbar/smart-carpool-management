// app/(tabs)/driver-home.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function DriverHome() {
  const [driverName, setDriverName] = useState('Driver');

  useEffect(() => {
    const loadDriver = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert("Session Expired", "Please log in");
        router.replace('/(auth)/login');
        return;
      }

      const { data } = await supabase
        .from('drivers')
        .select('name')
        .eq('driver_id', session.user.id)
        .single();

      if (data?.name) setDriverName(data.name.split(' ')[0]); // first name only
    };

    loadDriver();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {driverName}!</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(tabs)/driver-grouped-requests')}
        >
          <Ionicons name="people-outline" size={40} color="#7C3AED" />
          <Text style={styles.cardTitle}>Grouped Ride Requests</Text>
          <Text style={styles.cardDesc}>Accept shared rides to earn more</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(tabs)/driver-earnings')}
        >
          <Ionicons name="cash-outline" size={40} color="#7C3AED" />
          <Text style={styles.cardTitle}>My Earnings</Text>
          <Text style={styles.cardDesc}>Monthly & total earnings overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(tabs)/driver-active-rides')}
        >
          <Ionicons name="car-outline" size={40} color="#7C3AED" />
          <Text style={styles.cardTitle}>Active Rides</Text>
          <Text style={styles.cardDesc}>Manage ongoing rides</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  container: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});