import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export default function Payment() {
  const { requestId, fare, pickup, destination } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [rideId, setRideId] = useState(null);

  useEffect(() => {
    const fetchContext = async () => {
      // Find the ride_id associated with this request (Fixes NULL ride_id in payments)
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
      if (!user) throw new Error("Authentication failed");

      // 1. Insert Payment
      const { error: payError } = await supabase.from('payments').insert({
        ride_id: rideId, // Linked to the actual ride record
        rider_id: user.id,
        amount: Number(fare),
        payment_status: 'completed',
        payment_date: new Date().toISOString(),
      });

      if (payError) throw payError;

      // 2. Update Request Status
      await supabase
        .from('ride_requests')
        .update({ request_status: 'paid' })
        .eq('request_id', requestId);

      Alert.alert(
        "Payment Success",
        `₹${fare} paid successfully!`,
        [{ text: "Great!", onPress: () => router.replace('/(tabs)/rider-home') }]
      );
    } catch (err) {
      Alert.alert("Payment Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <BlurView intensity={80} tint="dark" style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="wallet" size={40} color="#10B981" />
          </View>
          
          <Text style={styles.title}>Payment Due</Text>
          <Text style={styles.amount}>₹{fare}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#94A3B8" />
            <Text style={styles.infoText} numberOfLines={2}>
              {pickup} → {destination}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.payBtn, loading && styles.disabled]} 
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
          
          <Text style={styles.secureText}>
            <Ionicons name="lock-closed" size={12} color="#94A3B8" /> Secure Demo Transaction
          </Text>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { color: '#94A3B8', fontSize: 16, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  amount: { color: '#F8FAFC', fontSize: 56, fontWeight: '900', marginVertical: 10 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(148, 163, 184, 0.1)', marginVertical: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  infoText: { color: '#F1F5F9', fontSize: 15, marginLeft: 10, flex: 1 },
  payBtn: {
    backgroundColor: '#10B981',
    width: '100%',
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  payBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  secureText: { color: '#94A3B8', fontSize: 12, marginTop: 20 },
});