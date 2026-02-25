// app/(tabs)/driver-earnings.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function DriverEarnings() {
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [rideCount, setRideCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  // Default to current month
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    const loadEarnings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        Alert.alert("Error", "Not logged in");
        return;
      }
      setDriverId(session.user.id);

      // Total earnings (all time)
      const { data: allRides, error: allErr } = await supabase
        .from('rides')
        .select('final_fare')
        .eq('driver_id', session.user.id)
        .eq('ride_status', 'completed');

      if (allErr) {
        Alert.alert("Error", allErr.message);
      } else {
        const total = allRides.reduce((sum, r) => sum + (r.final_fare || 0), 0);
        setTotalEarnings(total);
        setRideCount(allRides.length);
      }

      // Monthly earnings
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();

      const { data: monthlyRides, error: monthlyErr } = await supabase
        .from('rides')
        .select('final_fare')
        .eq('driver_id', session.user.id)
        .eq('ride_status', 'completed')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (monthlyErr) {
        Alert.alert("Error", monthlyErr.message);
      } else {
        const monthlyTotal = monthlyRides.reduce((sum, r) => sum + (r.final_fare || 0), 0);
        setMonthlyEarnings(monthlyTotal);
      }

      setLoading(false);
    };

    loadEarnings();
  }, [selectedMonth, selectedYear]);

  const changeMonth = (delta) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Ionicons name="chevron-back" size={28} color="#7C3AED" />
        </TouchableOpacity>

        <Text style={styles.month}>
          {monthName} {selectedYear}
        </Text>

        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={28} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Monthly Earnings</Text>
          <Text style={styles.amount}>₹{monthlyEarnings.toLocaleString()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Total Earnings (All Time)</Text>
          <Text style={styles.amount}>₹{totalEarnings.toLocaleString()}</Text>
          <Text style={styles.detail}>
            From {rideCount} completed ride{rideCount !== 1 ? 's' : ''}
          </Text>
        </View>

        <Text style={styles.note}>
          Earnings are calculated from completed rides (final_fare).
          {"\n"}Payments from riders are linked when you accept groups.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1E293B',
  },
  month: { fontSize: 20, fontWeight: '700', color: '#F8FAFC' },
  container: { padding: 16 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  label: { color: '#94A3B8', fontSize: 16, marginBottom: 8 },
  amount: { color: '#10B981', fontSize: 40, fontWeight: '900' },
  detail: { color: '#94A3B8', fontSize: 16, marginTop: 8 },
  note: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 24 },
});