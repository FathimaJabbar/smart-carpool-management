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
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  const RIDER_SHARE = 0.6;

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }
      setDriverId(session.user.id);

      const { data: requests, error } = await supabase
        .from('ride_requests')
        .select('*')
        .ilike('request_status', 'pending');

      if (error) throw error;

      const groupsMap = new Map();
      
      (requests || []).forEach(req => {
        const rawPickup = req.pickup_location ? String(req.pickup_location) : 'Unknown Pickup';
        const rawDest = req.destination ? String(req.destination) : 'Unknown Destination';
        
        const key = `${rawPickup.trim().toLowerCase()}||${rawDest.trim().toLowerCase()}`;
        
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            pickup: rawPickup.trim(),
            destination: rawDest.trim(),
            requestIds: [],
            totalSeats: 0,
            totalEarnings: 0,
          });
        }
        
        const g = groupsMap.get(key);
        g.requestIds.push(req.request_id);
        g.totalSeats += req.seats_required || 1;
        
        const fare = Number(req.estimated_fare) > 0 ? Number(req.estimated_fare) : 50; 
        g.totalEarnings += (fare * RIDER_SHARE);
      });

      setGroups(Array.from(groupsMap.values()));
    } catch (err: any) {
      console.error(err);
      Alert.alert("Database Error", "Failed to load requests from server.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const acceptGroup = async (group) => {
    setLoading(true);
    try {
      const { data: vehicle, error: vErr } = await supabase
        .from('vehicles')
        .select('vehicle_id')
        .eq('driver_id', driverId)
        .single();

      if (vErr || !vehicle) {
        Alert.alert("No Vehicle Found", "Please add a vehicle to your profile first.");
        return;
      }

      const { data: ride, error: rErr } = await supabase
        .from('rides')
        .insert({
          driver_id: driverId,
          vehicle_id: vehicle.vehicle_id,
          ride_status: 'ongoing',
          final_fare: Math.round(group.totalEarnings),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (rErr) throw rErr;

      const assignments = group.requestIds.map(id => ({
        ride_id: ride.ride_id,
        request_id: id
      }));
      
      const { error: assignErr } = await supabase.from('ride_assignments').insert(assignments);
      if (assignErr) throw assignErr;

      const { error: updateErr } = await supabase
        .from('ride_requests')
        .update({ request_status: 'accepted' })
        .in('request_id', group.requestIds);
        
      if (updateErr) throw updateErr;

      Alert.alert("Ride Started!", `You accepted a group of ${group.requestIds.length} riders.`, [
        { text: "View Active Rides", onPress: () => router.replace('/(tabs)/driver-active-rides') }
      ]);
      
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to accept group.");
    } finally {
      setLoading(false);
    }
  };

  const renderGroup = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="people" size={24} color="#7C3AED" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.groupTitle}>Shared Route</Text>
          <Text style={styles.passengerCount}>{item.requestIds.length} Passenger(s)</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.markerContainer}>
          <View style={[styles.dot, { backgroundColor: '#7C3AED' }]} />
          <View style={styles.line} />
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
        </View>
        <View style={styles.addressContainer}>
          <Text style={styles.addressText} numberOfLines={1}>{item.pickup}</Text>
          <Text style={styles.addressText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>TOTAL SEATS</Text>
          <Text style={styles.statValue}>{item.totalSeats}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>YOU EARN</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>₹{Math.round(item.totalEarnings)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptGroup(item)}>
        <Text style={styles.acceptBtnText}>Accept Group Trip</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/driver-home')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Available Groups</Text>
        <View style={{ width: 40 }}></View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color="#1E293B" style={{ marginBottom: 20 }} />
              <Text style={styles.emptyText}>No pending requests to group right now.</Text>
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
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