// app/(tabs)/payment.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Payment() {
  const { requestId, fare, pickup, destination } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [riderId, setRiderId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const amount = Number(fare) || 0;

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        setRiderId(user.id);
      } else {
        setErrorMsg("Not logged in. Please login again.");
        setTimeout(() => router.replace('/(auth)/login'), 1500);
      }
    };
    fetchUser();
  }, []);

  const handleConfirm = async () => {
    if (errorMsg) {
      Alert.alert("Error", errorMsg);
      return;
    }

    if (!riderId || !requestId || amount <= 0) {
      Alert.alert("Error", "Invalid ride or user information. Please try again.");
      return;
    }

    setLoading(true);

    try {
      // Insert payment
      const { error: payError } = await supabase.from('payments').insert({
        ride_id: null,
        rider_id: riderId,
        amount,
        payment_status: 'completed',
        payment_date: new Date().toISOString(),
      });

      if (payError) throw payError;

      // Optional: Update request status
      await supabase
        .from('ride_requests')
        .update({ request_status: 'paid_pending' })
        .eq('request_id', requestId);

      Alert.alert(
        "Payment Confirmed!",
        `₹${amount} recorded for ${pickup} → ${destination}.\nYour request is ready for drivers.`,
        [
          {
            text: "OK",
            onPress: () => router.replace('/(tabs)/rider-home'),
          },
        ]
      );
    } catch (err) {
      console.error("Payment error:", err);
      Alert.alert("Error", err.message || "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Payment Confirmation</Text>

        <View style={styles.summary}>
          <Text style={styles.label}>Ride Route</Text>
          <Text style={styles.value}>
            {pickup || 'Pickup'} → {destination || 'Destination'}
          </Text>

          <Text style={styles.label}>Amount Due</Text>
          <Text style={styles.amount}>₹{amount || 'N/A'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Confirm Payment (Simulated)</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Demo only — no real money is involved.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#F8FAFC', marginBottom: 40 },
  summary: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  label: { color: '#94A3B8', fontSize: 16, marginBottom: 8 },
  value: { color: '#F8FAFC', fontSize: 18, fontWeight: '600', marginBottom: 24 },
  amount: { color: '#10B981', fontSize: 48, fontWeight: '900' },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
    marginBottom: 24,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  note: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  errorText: { color: '#EF4444', fontSize: 18, textAlign: 'center', marginTop: 100 },
});