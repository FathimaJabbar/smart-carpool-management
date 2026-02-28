// app/(tabs)/rider-home.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function RiderHome() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);

    try {
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
        .limit(15);

      if (error) throw error;

      setRequests(data || []);
    } catch (err) {
      console.error("Load requests error:", err);
      Alert.alert("Error", "Failed to load your ride requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const goToPayment = (request) => {
    router.push({
      pathname: '/(tabs)/payment',
      params: {
        requestId: request.request_id,
        fare: request.estimated_fare || 0,
        pickup: request.pickup_location,
        destination: request.destination,
      },
    });
  };

  const renderRequest = ({ item }) => {
    const status = item.request_status.toLowerCase();
    const isPending = status === 'pending';
    const isAccepted = status === 'accepted' || status === 'paid_pending';
    const isCompleted = status === 'completed';
    const isPaid = status === 'paid';

    let statusColor = '#EF4444'; // default red
    if (isAccepted || isCompleted || isPaid) statusColor = '#10B981'; // green

    return (
      <View style={styles.requestCard}>
        {/* Route */}
        <View style={styles.routeRow}>
          <Ionicons name="location-sharp" size={22} color="#7C3AED" />
          <Text style={styles.route}>
            {item.pickup_location || 'Pickup'} → {item.destination || 'Destination'}
          </Text>
        </View>

        {/* Details row */}
        <View style={styles.detailsRow}>
          <Text style={styles.detail}>
            Date: {item.ride_date || new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {item.request_status.toUpperCase()}
          </Text>
          <Text style={styles.detail}>
            Seats: {item.seats_required}
          </Text>
        </View>

        {/* Action area - fixed height to prevent jump */}
        <View style={styles.actionArea}>
          {isCompleted && !isPaid && (
            <TouchableOpacity style={styles.payButton} onPress={() => goToPayment(item)}>
              <Text style={styles.payText}>Pay Now</Text>
            </TouchableOpacity>
          )}

          {isPaid && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.paidText}>Paid ✓</Text>
            </View>
          )}

          {isPending && (
            <Text style={styles.waitingText}>Waiting for a driver to accept...</Text>
          )}

          {isAccepted && !isCompleted && (
            <Text style={styles.waitingText}>Ride accepted — waiting for completion</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Your Ride Requests</Text>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No ride requests yet</Text>
          <TouchableOpacity
            style={styles.newButtonSmall}
            onPress={() => router.push('/(tabs)/create-request')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.newButtonTextSmall}>Create New Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.request_id}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadRequests}
              tintColor="#7C3AED"
            />
          }
        />
      )}

      {/* Floating action button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/create-request')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  newButtonSmall: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  newButtonTextSmall: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
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
  status: {
    fontWeight: '700',
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
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#7C3AED',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});