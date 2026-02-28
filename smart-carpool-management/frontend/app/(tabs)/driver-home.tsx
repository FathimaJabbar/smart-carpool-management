// app/(tabs)/driver-home.tsx
import { useState, useEffect, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function DriverHome() {
  const [driverName, setDriverName] = useState('Driver');

  const loadDriver = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/(auth)/login');
        return;
      }

      const { data } = await supabase
        .from('drivers')
        .select('name')
        .eq('driver_id', session.user.id)
        .single();

      if (data?.name) {
        setDriverName(data.name.split(' ')[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDriver();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {driverName}</Text>
            <Text style={styles.subtitle}>Driver Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Action Cards Wrapper */}
        <View style={styles.cardsWrapper}>
          
          {/* Grouped Requests Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/driver-grouped-requests')}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
              <Ionicons name="people" size={32} color="#7C3AED" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Available Groups</Text>
              <Text style={styles.cardDesc}>View and accept grouped ride requests</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>

          {/* Active Rides Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/driver-active-rides')}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="car-sport" size={32} color="#10B981" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Active Rides</Text>
              <Text style={styles.cardDesc}>Manage ongoing trips & mark completed</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>

          {/* Earnings Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/driver-earnings')}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="wallet" size={32} color="#F59E0B" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>My Earnings</Text>
              <Text style={styles.cardDesc}>Track your monthly and total revenue</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#64748B" />
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  container: { padding: 24, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  greeting: { fontSize: 32, fontWeight: '900', color: '#F8FAFC', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 4, fontWeight: '500' },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsWrapper: { gap: 16 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 18, paddingRight: 10 },
});