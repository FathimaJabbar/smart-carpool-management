import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';

export default function DriverActiveRides() {
  const [activeRides, setActiveRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveRides = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // DBMS JOIN: Fetching the ride, linking through assignments to get the request details
      const { data: rides, error } = await supabase
        .from('rides')
        .select(`
          ride_id,
          ride_status,
          final_fare,
          ride_assignments (
            request_id,
            ride_requests (
              pickup_location,
              destination,
              seats_required,
              rider_id
            )
          )
        `)
        .eq('driver_id', session.user.id)
        .eq('ride_status', 'ongoing');

      if (error) throw error;
      setActiveRides(rides || []);
    } catch (error) {
      Alert.alert('Error', 'Could not load active rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRides();
  }, []);

  const completeRide = async (rideId, assignments) => {
    Alert.alert("Complete Ride", "Mark this ride as finished?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Complete",
        onPress: async () => {
          setLoading(true);
          try {
            const requestIds = assignments.map(a => a.request_id);

            // 1. Update Ride Table
            await supabase.from('rides').update({ ride_status: 'completed' }).eq('ride_id', rideId);

            // 2. Update Request Table (Triggers Rider Payment)
            await supabase.from('ride_requests').update({ request_status: 'completed' }).in('request_id', requestIds);

            Alert.alert("Success", "Ride completed! Riders can now pay.");
            fetchActiveRides();
          } catch (error) {
            Alert.alert("Error", "Failed to update database.");
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const renderRide = ({ item }) => {
    return (
      <BlurView intensity={80} tint="dark" style={styles.rideCard}>
        <View style={styles.header}>
          <View style={styles.badge}><Text style={styles.badgeText}>ONGOING</Text></View>
          <Text style={styles.fareText}>Total: ₹{item.final_fare}</Text>
        </View>

        {item.ride_assignments.map((assignment, index) => {
          const req = assignment.ride_requests;
          return (
            <View key={index} style={styles.passengerRow}>
              <Ionicons name="person-circle-outline" size={24} color="#94A3B8" />
              <View style={styles.routeBox}>
                <Text style={styles.routeText} numberOfLines={1}>{req.pickup_location}</Text>
                <Ionicons name="arrow-down" size={12} color="#7C3AED" style={{ paddingVertical: 2 }} />
                <Text style={styles.routeText} numberOfLines={1}>{req.destination}</Text>
              </View>
              <Text style={styles.seatsText}>{req.seats_required} Seat(s)</Text>
            </View>
          );
        })}

        <TouchableOpacity style={styles.completeBtn} onPress={() => completeRide(item.ride_id, item.ride_assignments)}>
          <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFF" />
          <Text style={styles.completeBtnText}>Mark as Completed</Text>
        </TouchableOpacity>
      </BlurView>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Active Rides</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={activeRides}
          keyExtractor={(item) => item.ride_id}
          renderItem={renderRide}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No ongoing rides right now.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  headerBar: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15, backgroundColor: '#1E293B', padding: 8, borderRadius: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#F8FAFC' },
  listContainer: { padding: 20 },
  rideCard: { borderRadius: 20, padding: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.2)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badge: { backgroundColor: 'rgba(124, 58, 237, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#A78BFA', fontWeight: 'bold', fontSize: 12 },
  fareText: { color: '#10B981', fontSize: 18, fontWeight: '900' },
  passengerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 12, borderRadius: 12, marginBottom: 10 },
  routeBox: { flex: 1, marginLeft: 12 },
  routeText: { color: '#F1F5F9', fontSize: 14, fontWeight: '500' },
  seatsText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  completeBtn: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 15, marginTop: 10 },
  completeBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 50, fontSize: 16 }
});