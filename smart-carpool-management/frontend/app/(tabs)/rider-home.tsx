import { useState, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';

export default function RiderHome() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Rider');

  const loadRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/(auth)/login');
        return;
      }

      // Fetch user name for header
      const { data: profile } = await supabase
        .from('riders')
        .select('name')
        .eq('rider_id', session.user.id)
        .single();
      
      if (profile?.name) setUserName(profile.name.split(' ')[0]);

      // Fetch requests
      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('rider_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // useFocusEffect automatically reloads data when you come back from the Payment screen!
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  const goToPayment = (request) => {
    // Fallback to ₹50 just in case it's an old record with no fare
    const fareToPass = request.estimated_fare > 0 ? request.estimated_fare : 50; 
    
    router.push({
      pathname: '/(tabs)/payment',
      params: {
        requestId: request.request_id,
        fare: fareToPass,
        pickup: request.pickup_location,
        destination: request.destination,
      },
    });
  };

  const renderRequest = ({ item }) => {
    const status = item.request_status.toLowerCase();
    const isCompleted = status === 'completed';
    const isPaid = status === 'paid';
    
    // Status colors
    let statusColor = '#EF4444'; // Red for pending
    if (status === 'accepted') statusColor = '#3B82F6'; // Blue for accepted
    if (isCompleted || isPaid) statusColor = '#10B981'; // Green for done

    // Format the ugly date string into a pretty one!
    const dateObj = new Date(item.ride_date || item.created_at);
    const prettyDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
      <View style={styles.card}>
        {/* Card Header: Date & Status */}
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{prettyDate}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeContainer}>
          <Ionicons name="location" size={20} color="#7C3AED" />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.pickup_location} <Text style={{color: '#64748B'}}>→</Text> {item.destination}
          </Text>
        </View>

        {/* Footer: Seats & Action Buttons */}
        <View style={styles.cardFooter}>
          <Text style={styles.seatsText}>
            <Ionicons name="people" size={14} /> {item.seats_required} Seat(s)
          </Text>

          {isCompleted && !isPaid && (
            <TouchableOpacity style={styles.payBtn} onPress={() => goToPayment(item)}>
              <Text style={styles.payBtnText}>Pay Now</Text>
            </TouchableOpacity>
          )}

          {isPaid && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.paidText}>Paid</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#7C3AED" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Sleek Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName}</Text>
          <Text style={styles.subGreeting}>Your Ride Requests</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={80} color="#1E293B" style={{marginBottom: 20}} />
          <Text style={styles.emptyText}>No ride requests yet</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(tabs)/create-request')}>
            <Ionicons name="add-circle" size={24} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.createBtnText}>Create New Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.request_id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} tintColor="#7C3AED" />}
        />
      )}

      {/* Only show floating + button if list is NOT empty */}
      {requests.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/create-request')}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 10 },
  greeting: { fontSize: 28, fontWeight: '900', color: '#F8FAFC' },
  subGreeting: { fontSize: 16, color: '#94A3B8', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12 },
  listContainer: { padding: 20, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#64748B', fontSize: 18, marginBottom: 30 },
  createBtn: { flexDirection: 'row', backgroundColor: '#7C3AED', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center' },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.15)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  routeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 12, borderRadius: 12 },
  routeText: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginLeft: 10, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seatsText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  payBtn: { backgroundColor: '#10B981', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
  payBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  paidText: { color: '#10B981', fontWeight: '800', marginLeft: 6 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#7C3AED', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});