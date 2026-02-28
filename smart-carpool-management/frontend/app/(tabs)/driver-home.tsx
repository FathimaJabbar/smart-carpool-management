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

      if (data?.name) {
        // Show first name only for greeting
        setDriverName(data.name.split(' ')[0]);
      }
    };

    loadDriver();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
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
        {/* Header with greeting and logout */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {driverName}!</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Grouped Requests Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/driver-grouped-requests')}
        >
          <Ionicons name="people-outline" size={40} color="#7C3AED" />
          <Text style={styles.cardTitle}>Grouped Ride Requests</Text>
          <Text style={styles.cardDesc}>
            View and accept shared rides to maximize your earnings
          </Text>
        </TouchableOpacity>

        {/* Earnings Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/driver-earnings')}
        >
          <Ionicons name="cash-outline" size={40} color="#7C3AED" />
          <Text style={styles.cardTitle}>My Earnings</Text>
          <Text style={styles.cardDesc}>
            Track your monthly and total earnings from completed rides
          </Text>
        </TouchableOpacity>

        {/* Active Rides Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/driver-active-rides')}
        >
          <Ionicons name="car-outline" size={40} color="#7C3AED" />
          <Text style={styles.cardTitle}>Active Rides</Text>
          <Text style={styles.cardDesc}>
            Manage your ongoing rides and mark them as completed
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});