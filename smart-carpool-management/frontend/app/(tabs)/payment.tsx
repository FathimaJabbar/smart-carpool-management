import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalAlert } from '@/components/GlobalAlert'; // <-- Imported Global Alert

export default function Payment() {
  const { requestId, fare, pickup, destination } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [rideId, setRideId] = useState(null);
  
  const { showAlert } = useGlobalAlert(); // <-- Initialized Hook

  // Fallback check: If fare came in as 0 or undefined, default to 50
  const amountToPay = Number(fare) > 0 ? Number(fare) : 50;

  useEffect(() => {
    const fetchContext = async () => {
      const { data } = await supabase
        .from('ride_assignments')
        .select('ride_id')
        .eq('request_id', requestId)
        .single();
      if (data) setRideId(data.ride_id);
    };
    fetchContext();
  }, [requestId]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insert Payment into DB
      const { error: payError } = await supabase.from('payments').insert({
        ride_id: rideId,
        rider_id: user.id,
        amount: amountToPay,
        payment_status: 'completed',
        payment_date: new Date().toISOString(),
      });

      if (payError) throw payError;

      // 2. Update the ride request to 'paid'
      const { error: updateErr } = await supabase
        .from('ride_requests')
        .update({ request_status: 'paid' })
        .eq('request_id', requestId);
        
      if (updateErr) throw updateErr;

      // Premium Success Alert with Redirect Callback
      showAlert("Payment Success", `₹${amountToPay} paid successfully!`, "success", () => {
        router.replace('/(tabs)/rider-home');
      });

    } catch (err: any) {
      showAlert("Payment Failed", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="wallet" size={40} color="#10B981" />
          </View>
          
          <Text style={styles.title}>Payment Due</Text>
          <Text style={styles.amount}>₹{amountToPay}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#7C3AED" />
            <Text style={styles.infoText} numberOfLines={2}>
              {pickup} → {destination}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.payBtn, loading && { opacity: 0.6 }]} 
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={styles.payBtnText}>Confirm Payment</Text>
                <Ionicons name="shield-checkmark" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { backgroundColor: '#1E293B', padding: 10, borderRadius: 12 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', padding: 24, paddingBottom: 60 },
  card: { backgroundColor: '#1E293B', borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { color: '#94A3B8', fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  amount: { color: '#F8FAFC', fontSize: 64, fontWeight: '900', marginVertical: 10 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(148, 163, 184, 0.1)', marginVertical: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 16, borderRadius: 16 },
  infoText: { color: '#F1F5F9', fontSize: 15, marginLeft: 12, flex: 1, fontWeight: '600' },
  payBtn: { backgroundColor: '#10B981', width: '100%', height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  payBtnText: { color: '#052E16', fontSize: 18, fontWeight: '800' },git 
});