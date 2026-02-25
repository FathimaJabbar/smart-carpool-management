// app/(tabs)/driver-grouped-requests.tsx
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

export default function DriverGroupedRequests() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  // Pricing constants (adjust as needed)
  const BASE_FARE = 30;
  const RATE_PER_KM = 8;
  const RIDER_SHARE = 0.6; // Riders pay 60% of full → driver gets more with groups
  const AVG_DISTANCE = 12; // fallback — improve with OSRM later if needed

  useEffect(() => {
    const loadGroups = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        Alert.alert("Error", "Not logged in");
        setLoading(false);
        return;
      }
      setDriverId(session.user.id);

      const { data: requests, error } = await supabase
        .from('ride_requests')
        .select('request_id, pickup_location, destination, seats_required')
        .eq('request_status', 'pending');

      if (error) {
        Alert.alert("Error loading requests", error.message);
        setLoading(false);
        return;
      }

      console.log("Fetched pending requests:", requests); // Debug: check in console

      // Group by normalized pickup + destination
      const groupsMap = new Map();

      requests.forEach(req => {
        const pickupClean = (req.pickup_location || '').trim().toLowerCase();
        const destClean = (req.destination || '').trim().toLowerCase();
        const key = `${pickupClean}|||${destClean}`;

        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            pickup: req.pickup_location,
            destination: req.destination,
            totalSeats: 0,
            riderCount: 0,
            requestIds: [],
          });
        }

        const group = groupsMap.get(key);
        group.totalSeats += req.seats_required || 0;
        group.riderCount += 1;
        group.requestIds.push(req.request_id);
      });

      // Calculate earnings for each group
      const groupedArray = Array.from(groupsMap.values()).map(g => {
        const distanceKm = AVG_DISTANCE;
        const fullFare = BASE_FARE + distanceKm * RATE_PER_KM; // single rider full price
        const perRiderFare = Math.round(fullFare * RIDER_SHARE);
        const totalEarnings = perRiderFare * g.riderCount;

        return {
          ...g,
          distanceKm,
          perRiderFare,
          totalEarnings,
        };
      });

      setGroups(groupedArray);
      setLoading(false);
    };

    loadGroups();
  }, []);

 const acceptGroup = async (group) => {
  if (!group || group.riderCount === 0 || group.requestIds.length === 0) {
    Alert.alert("Error", "Invalid group - no requests to accept");
    console.log("Invalid group data:", group);
    return;
  }

  Alert.alert(
    "Accept Group?",
    `${group.pickup} → ${group.destination}\n` +
    `${group.riderCount} rider${group.riderCount > 1 ? 's' : ''}\n` +
    `${group.totalSeats} seat${group.totalSeats > 1 ? 's' : ''}\n` +
    `Each rider pays ≈ ₹${group.perRiderFare}\n` +
    `You earn: ₹${group.totalEarnings}`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          try {
            // 1. Get driver's vehicle (first one)
            const { data: vehicle, error: vehErr } = await supabase
              .from('vehicles')
              .select('vehicle_id')
              .eq('driver_id', driverId)
              .limit(1)
              .single();

            if (vehErr || !vehicle) {
              throw new Error("No vehicle registered. Please add one first.");
            }

            // 2. Create ride with vehicle_id and total final_fare
            const { data: ride, error: rideErr } = await supabase
              .from('rides')
              .insert({
                driver_id: driverId,
                vehicle_id: vehicle.vehicle_id,
                ride_status: 'ongoing', // or 'confirmed' if you allowed it
                final_fare: group.totalEarnings, // total from all riders in group
                created_at: new Date().toISOString(),
              })
              .select('ride_id')
              .single();

            if (rideErr) throw rideErr;

            const rideId = ride.ride_id;

            // 3. Assign all requests in group
            const assignments = group.requestIds.map(id => ({
              request_id: id,
              ride_id: rideId,
            }));

            const { error: assignErr } = await supabase
              .from('ride_assignments')
              .insert(assignments);

            if (assignErr) throw assignErr;

            // 4. Update request statuses to accepted
            const { error: updateErr } = await supabase
              .from('ride_requests')
              .update({ request_status: 'accepted' })
              .in('request_id', group.requestIds);

            if (updateErr) throw updateErr;

            // 5. NEW: Link all payments for these riders to the new ride
            // Get rider_ids from the requests in this group
            const { data: riderData, error: riderErr } = await supabase
              .from('ride_requests')
              .select('rider_id')
              .in('request_id', group.requestIds);

            if (riderErr) {
              console.warn("Failed to fetch riders for payment linking:", riderErr);
            } else {
              const riderIds = riderData?.map(r => r.rider_id) || [];

              if (riderIds.length > 0) {
                const { error: linkErr } = await supabase
                  .from('payments')
                  .update({ ride_id: rideId })
                  .in('rider_id', riderIds)
                  .is('ride_id', null); // only update those still null

                if (linkErr) {
                  console.warn("Payment linking warning:", linkErr);
                  // Non-blocking — don't fail the accept
                } else {
                  console.log(`Linked ${riderIds.length} payments to ride ${rideId}`);
                }
              }
            }

            // 6. Success feedback + redirect
            Alert.alert(
              "Success",
              `Group accepted! Ride created.\nYou earn ₹${group.totalEarnings}`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    router.replace('/(tabs)/driver-home');
                  },
                },
              ]
            );

            // Remove from UI
            setGroups(prev => prev.filter(g => g.key !== group.key));
          } catch (err) {
            console.error("Accept failed:", err);
            Alert.alert("Error", err.message || "Failed to accept group");
          }
        },
      },
    ]
  );
};
  const renderGroup = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.routeRow}>
        <Ionicons name="location-sharp" size={24} color="#7C3AED" />
        <Text style={styles.route}>
          {item.pickup || 'Unknown Pickup'} → {item.destination || 'Unknown Destination'}
        </Text>
      </View>

      <Text style={styles.stats}>
        {item.riderCount} rider{item.riderCount > 1 ? 's' : ''} • {item.totalSeats} seat{item.totalSeats > 1 ? 's' : ''}
      </Text>

      <Text style={styles.earnings}>
        You earn: ₹{item.totalEarnings}
        {'\n'}
        <Text style={styles.earningsDetail}>(each rider ≈ ₹{item.perRiderFare})</Text>
      </Text>

      <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptGroup(item)}>
        <Text style={styles.acceptText}>Accept Group</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Grouped Pending Requests</Text>

      {groups.length === 0 ? (
        <Text style={styles.empty}>No pending grouped requests</Text>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={item => item.key}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  title: { fontSize: 26, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', marginVertical: 20 },
  empty: { color: '#94A3B8', fontSize: 18, textAlign: 'center', marginTop: 60 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  route: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginLeft: 12, flex: 1 },
  stats: { color: '#94A3B8', fontSize: 16, marginBottom: 6 },
  earnings: { color: '#10B981', fontSize: 18, fontWeight: '700', marginVertical: 12 },
  earningsDetail: { fontSize: 14, color: '#94A3B8' },
  acceptBtn: { backgroundColor: '#7C3AED', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  acceptText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});