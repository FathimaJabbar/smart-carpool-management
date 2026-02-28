import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useGlobalAlert } from '@/components/GlobalAlert';

export default function DriverEarnings() {
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [rideCount, setRideCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const { showAlert } = useGlobalAlert();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const driverId = session.user.id;

      const { count: lifetimeTrips, error: countErr } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .eq('ride_status', 'completed');

      if (countErr) throw countErr;
      setRideCount(lifetimeTrips || 0);

      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select('amount, payment_date, rides!inner(driver_id)')
        .eq('rides.driver_id', driverId)
        .eq('payment_status', 'completed');

      if (payErr) throw payErr;

      const total = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      setTotalEarnings(total);

      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getTime();
      const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).getTime();

      const monthlyTotal = (payments || []).reduce((sum, p) => {
        const payDate = new Date(p.payment_date).getTime();
        if (payDate >= startOfMonth && payDate <= endOfMonth) {
          return sum + (Number(p.amount) || 0);
        }
        return sum;
      }, 0);

      setMonthlyEarnings(monthlyTotal);

    } catch (err: any) {
      console.error(err);
      showAlert("Ledger Error", "Could not load verified payments from the database.", "error");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEarnings();
    }, [selectedMonth, selectedYear])
  );

  const changeMonth = (delta) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 12) { newMonth = 1; newYear++; } 
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ flex: 1 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          
          <BlurView intensity={80} tint="dark" style={styles.heroCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet" size={32} color="#10B981" />
            </View>
            <Text style={styles.heroLabel}>VERIFIED BALANCE</Text>
            <Text style={styles.heroAmount}>₹{totalEarnings.toLocaleString()}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rideCount} Completed Trips</Text>
            </View>
          </BlurView>

          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
              <Ionicons name="chevron-back" size={24} color="#7C3AED" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthName} {selectedYear}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
              <Ionicons name="chevron-forward" size={24} color="#7C3AED" />
            </TouchableOpacity>
          </View>

          <View style={styles.monthlyCard}>
            <View style={styles.monthlyHeader}>
              <Ionicons name="calendar-outline" size={24} color="#94A3B8" />
              <Text style={styles.monthlyLabel}>Earnings this month</Text>
            </View>
            <Text style={styles.monthlyAmount}>₹{monthlyEarnings.toLocaleString()}</Text>
            {/* The extra text was removed from here! */}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { backgroundColor: '#1E293B', padding: 10, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#F8FAFC' },
  container: { padding: 20 },
  
  heroCard: {
    borderRadius: 30, padding: 30, alignItems: 'center', marginBottom: 30,
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  heroAmount: { color: '#F8FAFC', fontSize: 48, fontWeight: '900', marginBottom: 16 },
  badge: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  badgeText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 20, padding: 10, marginBottom: 20 },
  arrowBtn: { padding: 10, backgroundColor: 'rgba(124, 58, 237, 0.1)', borderRadius: 12 },
  monthText: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },

  monthlyCard: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  monthlyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  monthlyLabel: { color: '#94A3B8', fontSize: 16, fontWeight: '600', marginLeft: 10 },
  monthlyAmount: { color: '#10B981', fontSize: 36, fontWeight: '800' },
});