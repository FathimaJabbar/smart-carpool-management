import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useGlobalAlert } from '@/components/GlobalAlert'; // The new Global Alert

export default function DriverActiveRides() {
  const [activeRides, setActiveRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useGlobalAlert();

  const loadActiveRides = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const driverId = session.user.id;

      // 1. Fetch the Ongoing Ride for this driver
      const { data: rides, error: rErr } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', driverId)
        .eq('ride_status', 'ongoing')
        .order('created_at', { ascending: false });

      if (rErr) throw rErr;

      // 2. Fetch the associated passengers (requests) for each ride
      const formattedRides = [];
      for (const ride of (rides || [])) {
        const { data: assignments } = await supabase
          .from('ride_assignments')
          .select('request_id')
          .eq('ride_id', ride.ride_id);

        const reqIds = assignments.map(a => a.request_id);
        
        const { data: requests } = await supabase
          .from('ride_requests')
          .select('*')
          .in('request_id', reqIds);

        formattedRides.push({
          ...ride,
          passengers: requests || [],
        });
      }

      setActiveRides(formattedRides);
    } catch (err) {
      showAlert('Error', 'Could not load your active rides.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🚨 This forces the page to refresh concurrently every time the tab is opened!
  useFocusEffect(
    useCallback(() => {
      loadActiveRides();
    }, [])
  );

  const completeRide = async (rideId, passengers) => {
    setLoading(true);
    try {
      // 1. Mark the main ride as completed
      const { error: rideErr } = await supabase
        .from('rides')
        .update({ ride_status: 'completed' })
        .eq('ride_id', rideId);
      if (rideErr) throw rideErr;

      // 2. Mark ALL passenger requests as completed
      const reqIds = passengers.map(p => p.request_id);
      const { error: reqErr } = await supabase
        .from('ride_requests')
        .update({ request_status: 'completed' })
        .in('request_id', reqIds);
      if (reqErr) throw reqErr;

      showAlert('Ride Completed!', 'The riders have been billed.', 'success', () => {
        loadActiveRides(); // Refresh the list
      });
      
    } catch (err) {
      showAlert('Completion Error', 'Could not complete the ride.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderRide = ({ item }) => {
    const totalSeats = item.passengers.reduce((sum, p) => sum + p.seats_required, 0);

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>ONGOING</Text>
          </View>
          <Text style={styles.fareText}>Total: ₹{item.final_fare}</Text>
        </View>

        {/* Dynamic Passenger List */}
        {item.passengers.map((passenger, index) => (
          <View key={passenger.request_id} style={styles.passengerRow}>
            <Ionicons name="person-circle" size={32} color="#64748B" />
            <View style={styles.passengerDetails}>
              <Text style={styles.routeText} numberOfLines={1}>{passenger.pickup_location}</Text>
              <Ionicons name="arrow-down" size={14} color="#7C3AED" style={{ marginVertical: 2 }} />
              <Text style={styles.routeText} numberOfLines={1}>{passenger.destination}</Text>
            </View>
            <Text style={styles.seatText}>{passenger.seats_required} Seat(s)</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Complete Button */}
        <TouchableOpacity 
          style={styles.completeBtn} 
          onPress={() => completeRide(item.ride_id, item.passengers)}
        >
          <Ionicons name="checkmark-done-circle" size={20} color="#052E16" style={{ marginRight: 8 }} />
          <Text style={styles.completeBtnText}>Mark as Completed</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/driver-home')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Active Rides</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={activeRides}
          renderItem={renderRide}
          keyExtractor={(item) => item.ride_id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color="#1E293B" style={{ marginBottom: 20 }} />
              <Text style={styles.emptyText}>You have no active rides.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { backgroundColor: '#1E293B', padding: 10, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#F8FAFC' },
  listContainer: { padding: 20, paddingBottom: 40 },
  
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { backgroundColor: 'rgba(124, 58, 237, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: '#A78BFA', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  fareText: { color: '#10B981', fontSize: 20, fontWeight: '900' },
  
  passengerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: 12, borderRadius: 16, marginBottom: 12 },
  passengerDetails: { flex: 1, marginLeft: 12 },
  routeText: { color: '#F1F5F9', fontSize: 14, fontWeight: '600' },
  seatText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },
  
  completeBtn: { backgroundColor: '#10B981', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  completeBtnText: { color: '#052E16', fontSize: 16, fontWeight: '800' },
  
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748B', fontSize: 16, textAlign: 'center' },
});