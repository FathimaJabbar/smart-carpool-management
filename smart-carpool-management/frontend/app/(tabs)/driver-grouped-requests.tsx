import { useState, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';

export default function DriverGroupedRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  const RIDER_SHARE = 0.6; // Carpool discount factor

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setDriverId(session.user.id);

      // Fetch all pending requests (Individual groups of friends)
      const { data: pendingRequests, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('request_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(pendingRequests || []);
    } catch (err) {
      Alert.alert("Database Error", "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadRequests(); }, []));

  const acceptRequest = async (request) => {
    setLoading(true);
    try {
      // 1. Get Driver's Vehicle Capacity
      const { data: vehicle, error: vErr } = await supabase
        .from('vehicles')
        .select('vehicle_id, seating_capacity, vehicle_model')
        .eq('driver_id', driverId)
        .single();

      if (vErr || !vehicle) {
        Alert.alert("No Vehicle", "Please add a vehicle to your profile first.");
        return;
      }

      // Check if this single request is bigger than the whole car
      if (request.seats_required > vehicle.seating_capacity) {
        Alert.alert("Too Many People", `Your ${vehicle.vehicle_model} only holds ${vehicle.seating_capacity} people.`);
        return;
      }

      // 2. Check for an ONGOING ride
      const { data: activeRides } = await supabase
        .from('rides')
        .select('ride_id, final_fare')
        .eq('driver_id', driverId)
        .eq('ride_status', 'ongoing');

      let targetRideId;
      let currentFare = 0;
      let additionalFare = Math.round((request.estimated_fare || 50) * RIDER_SHARE);

      if (activeRides && activeRides.length > 0) {
        const activeRide = activeRides[0];
        targetRideId = activeRide.ride_id;
        currentFare = activeRide.final_fare || 0;

        // DBMS LOGIC: Calculate currently occupied seats
        const { data: assignments } = await supabase.from('ride_assignments').select('request_id').eq('ride_id', targetRideId);
        const reqIds = assignments.map(a => a.request_id);
        
        const { data: acceptedReqs } = await supabase.from('ride_requests').select('seats_required').in('request_id', reqIds);
        const occupiedSeats = acceptedReqs.reduce((sum, r) => sum + r.seats_required, 0);

        // Check if adding these new passengers exceeds remaining capacity
        if (occupiedSeats + request.seats_required > vehicle.seating_capacity) {
          Alert.alert("Car is Full!", `You only have ${vehicle.seating_capacity - occupiedSeats} seat(s) left in your current carpool.`);
          return;
        }

        // Update the ride's total fare
        await supabase.from('rides').update({ final_fare: currentFare + additionalFare }).eq('ride_id', targetRideId);

      } else {
        // No active ride? Create a new one!
        const { data: newRide, error: rErr } = await supabase
          .from('rides')
          .insert({
            driver_id: driverId,
            vehicle_id: vehicle.vehicle_id,
            ride_status: 'ongoing',
            final_fare: additionalFare,
            created_at: new Date().toISOString()
          }).select().single();

        if (rErr) throw rErr;
        targetRideId = newRide.ride_id;
      }

      // 3. Link the request to the Ride and update status
      await supabase.from('ride_assignments').insert({ ride_id: targetRideId, request_id: request.request_id });
      await supabase.from('ride_requests').update({ request_status: 'accepted' }).eq('request_id', request.request_id);

      Alert.alert("Added to Carpool!", "You have accepted this request.", [
        { text: "View Active Rides", onPress: () => router.replace('/(tabs)/driver-active-rides') },
        { text: "Find More", onPress: () => loadRequests() }
      ]);
      
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRequest = ({ item }) => {
    const earnAmount = Math.round((item.estimated_fare || 50) * RIDER_SHARE);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={24} color="#7C3AED" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.groupTitle}>Ride Request</Text>
            <Text style={styles.passengerCount}>{item.seats_required} Passenger(s)</Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.markerContainer}>
            <View style={[styles.dot, { backgroundColor: '#7C3AED' }]} />
            <View style={styles.line} />
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          </View>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText} numberOfLines={1}>{item.pickup_location}</Text>
            <Text style={styles.addressText} numberOfLines={1}>{item.destination}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SEATS NEEDED</Text>
            <Text style={styles.statValue}>{item.seats_required}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ADD TO EARNINGS</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>+₹{earnAmount}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(item)}>
          <Text style={styles.acceptBtnText}>Accept Request</Text>
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
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
        <Text style={styles.title}>Available Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color="#1E293B" style={{ marginBottom: 20 }} />
              <Text style={styles.emptyText}>No pending requests right now.</Text>
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
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.2)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(124, 58, 237, 0.1)', justifyContent: 'center', alignItems: 'center' },
  headerText: { marginLeft: 16 },
  groupTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  passengerCount: { color: '#94A3B8', fontSize: 14, marginTop: 2 },
  routeContainer: { flexDirection: 'row', marginBottom: 24, backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: 16, borderRadius: 16 },
  markerContainer: { alignItems: 'center', marginRight: 16, paddingTop: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, height: 24, backgroundColor: 'rgba(148, 163, 184, 0.2)', marginVertical: 4 },
  addressContainer: { flex: 1, justifyContent: 'space-between' },
  addressText: { color: '#F1F5F9', fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 4 },
  statLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
  statValue: { color: '#F8FAFC', fontSize: 24, fontWeight: '900' },
  acceptBtn: { backgroundColor: '#7C3AED', height: 60, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginRight: 8 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748B', fontSize: 16, textAlign: 'center' },
});