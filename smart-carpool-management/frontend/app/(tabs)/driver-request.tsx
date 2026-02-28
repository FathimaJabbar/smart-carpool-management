import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function DriverGroupedRequests() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  const RIDER_SHARE = 0.6; // Riders pay 60% of estimated fare in a group

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setDriverId(session.user.id);

      const { data: requests, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('request_status', 'pending');

      if (error) throw error;

      const groupsMap = new Map();
      requests.forEach(req => {
        // Normalize location for grouping
        const key = `${req.pickup_location.trim().toLowerCase()}||${req.destination.trim().toLowerCase()}`;
        
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            pickup: req.pickup_location,
            destination: req.destination,
            requestIds: [],
            totalSeats: 0,
            totalEarnings: 0,
            riders: []
          });
        }
        
        const g = groupsMap.get(key);
        g.requestIds.push(req.request_id);
        g.totalSeats += req.seats_required;
        g.totalEarnings += (req.estimated_fare * RIDER_SHARE);
        g.riders.push(req.rider_id);
      });

      setGroups(Array.from(groupsMap.values()));
    } catch (err) {
      Alert.alert("Error", "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const acceptGroup = async (group) => {
    setLoading(true);
    try {
      // 1. Fetch the driver's vehicle (Fixes NULL vehicle_id)
      const { data: vehicle, error: vErr } = await supabase
        .from('vehicles')
        .select('vehicle_id')
        .eq('driver_id', driverId)
        .single();

      if (vErr || !vehicle) {
        Alert.alert("No Vehicle", "Please add a vehicle to your profile first.");
        return;
      }

      // 2. Create the Ride (Fixes NULL final_fare)
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

      // 3. Link Assignments
      const assignments = group.requestIds.map(id => ({
        ride_id: ride.ride_id,
        request_id: id
      }));
      await supabase.from('ride_assignments').insert(assignments);

      // 4. Update status of all riders
      await supabase
        .from('ride_requests')
        .update({ request_status: 'accepted' })
        .in('request_id', group.requestIds);

      Alert.alert("Success", "Ride Started! Check 'Active Rides' for details.");
      router.replace('/(tabs)/driver-home');
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderGroup = ({ item, index }) => (
    <Animated.View entering={FadeInUp.delay(index * 100)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="people-circle-outline" size={32} color="#7C3AED" />
        <View style={styles.headerText}>
          <Text style={styles.groupTitle}>Grouped Request</Text>
          <Text style={styles.passengerCount}>{item.requestIds.length} Passengers</Text>
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
          <Text style={styles.statLabel}>SEATS</Text>
          <Text style={styles.statValue}>{item.totalSeats}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>EST. EARNINGS</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>₹{Math.round(item.totalEarnings)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptGroup(item)}>
        <Text style={styles.acceptBtnText}>Accept Group Trip</Text>
        <Ionicons name="chevron-forward" size={20} color="#FFF" />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Available Groups</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={groups}
            renderItem={renderGroup}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No requests in your area yet.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#F8FAFC', marginBottom: 24 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerText: { marginLeft: 12 },
  groupTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  passengerCount: { color: '#94A3B8', fontSize: 14 },
  routeContainer: { flexDirection: 'row', marginBottom: 20 },
  markerContainer: { alignItems: 'center', marginRight: 15, paddingTop: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, height: 30, backgroundColor: 'rgba(148, 163, 184, 0.2)', marginVertical: 4 },
  addressContainer: { flex: 1, justifyContent: 'space-between' },
  addressText: { color: '#F1F5F9', fontSize: 15, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  statValue: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  acceptBtn: {
    backgroundColor: '#7C3AED',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginRight: 8 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 100, fontSize: 16 },
});