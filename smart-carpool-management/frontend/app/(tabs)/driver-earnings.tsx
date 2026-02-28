// app/(tabs)/driver-earnings.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function DriverEarnings() {
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [rideCount, setRideCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverId, setDriverId] = useState(null);

  // Default to current month
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        Alert.alert("Error", "Not logged in");
        return;
      }
      setDriverId(session.user.id);

      // Total earnings (all time completed rides)
      const { data: allRides, error: allErr } = await supabase
        .from('rides')
        .select('final_fare')
        .eq('driver_id', session.user.id)
        .eq('ride_status', 'completed');

      if (allErr) throw allErr;

      const total = allRides.reduce((sum, r) => sum + (r.final_fare || 0), 0);
      setTotalEarnings(total);
      setRideCount(allRides.length);

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

      if (monthlyErr) throw monthlyErr;

      const monthlyTotal = monthlyRides.reduce((sum, r) => sum + (r.final_fare || 0), 0);
      setMonthlyEarnings(monthlyTotal);

      // Bonus: Count linked payments (for verification)
      const { count: payCount, error: payErr } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('ride_id', (allRides.length > 0 ? allRides[0].ride_id : null)) // example - adjust if needed
        .eq('payment_status', 'completed');

      if (!payErr) setPaymentCount(payCount || 0);
    } catch (err) {
      console.error("Earnings load error:", err);
      Alert.alert("Error", "Failed to load earnings. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

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

  const onRefresh = useCallback(() => {
    loadEarnings();
  }, [loadEarnings]);

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
          <Ionicons name="chevron-back" size={32} color="#7C3AED" />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {monthName} {selectedYear}
        </Text>

        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={32} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
        }
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={28} color="#7C3AED" />
            <Text style={styles.cardLabel}>Monthly Earnings</Text>
          </View>
          <Text style={styles.cardAmount}>₹{monthlyEarnings.toLocaleString()}</Text>
          {monthlyEarnings === 0 && (
            <Text style={styles.cardEmpty}>No completed rides this month</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={28} color="#7C3AED" />
            <Text style={styles.cardLabel}>Total Earnings</Text>
          </View>
          <Text style={styles.cardAmount}>₹{totalEarnings.toLocaleString()}</Text>
          <Text style={styles.cardDetail}>
            From {rideCount} completed ride{rideCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.cardDetail}>
            {paymentCount} payment{paymentCount !== 1 ? 's' : ''} received
          </Text>
        </View>

        <Text style={styles.note}>
          Earnings are based on final_fare from completed rides.
          {"\n"}Refresh to update latest data.
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  container: { padding: 20 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  cardAmount: {
    color: '#10B981',
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardDetail: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 4,
  },
  cardEmpty: {
    color: '#94A3B8',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 8,
  },
  note: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
});