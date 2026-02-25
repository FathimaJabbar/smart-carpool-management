// app/(tabs)/rider-home.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function RiderHome() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadUserAndRequests = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        Alert.alert("Error", "Not logged in");
        router.replace('/(auth)/login');
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('rider_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        Alert.alert("Error loading requests", error.message);
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    };

    loadUserAndRequests();
  }, []);

  const goToPayment = (request) => {
    router.push({
      pathname: '/(tabs)/payment',
      params: {
        requestId: request.request_id,
        fare: request.estimated_fare || 0, // if you have this column
        pickup: request.pickup_location,
        destination: request.destination,
      },
    });
  };

  const renderRequest = ({ item }) => {
    const isAccepted = item.request_status === 'accepted' || item.request_status === 'paid_pending';
    const isPaidOrCompleted = item.request_status === 'paid' || item.request_status === 'completed';

    return (
      <View style={styles.requestCard}>
        {/* Route */}
        <View style={styles.routeRow}>
          <Ionicons name="location-sharp" size={22} color="#7C3AED" />
          <Text style={styles.route}>
            {item.pickup_location} → {item.destination}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.detailsRow}>
          <Text style={styles.detail}>
            Date: {item.ride_date || new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={[
            styles.detail,
            { color: isPaidOrCompleted || isAccepted ? '#10B981' : '#EF4444' }
          ]}>
            {item.request_status.toUpperCase()}
          </Text>
          <Text style={styles.detail}>
            Seats: {item.seats_required}
          </Text>
        </View>

        {/* Action area - always reserves space */}
        <View style={styles.actionArea}>
          {isAccepted && (
            <TouchableOpacity style={styles.payButton} onPress={() => goToPayment(item)}>
              <Text style={styles.payText}>Pay Now</Text>
            </TouchableOpacity>
          )}

          {isPaidOrCompleted && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.paidText}>Paid ✓</Text>
            </View>
          )}

          {!isAccepted && !isPaidOrCompleted && (
            <Text style={styles.waitingText}>Waiting for driver...</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Your Ride Requests</Text>

      {requests.length === 0 ? (
        <Text style={styles.empty}>No recent requests yet</Text>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.request_id}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      <TouchableOpacity
        style={styles.newButton}
        onPress={() => router.push('/(tabs)/create-request')}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.newButtonText}>New Request</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  title: { fontSize: 26, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', marginVertical: 20 },
  empty: { color: '#94A3B8', fontSize: 18, textAlign: 'center', marginTop: 60 },
  requestCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  route: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detail: {
    color: '#94A3B8',
    fontSize: 14,
  },
  actionArea: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '70%',
    alignItems: 'center',
  },
  payText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  paidText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  waitingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic',
  },
  newButton: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
});