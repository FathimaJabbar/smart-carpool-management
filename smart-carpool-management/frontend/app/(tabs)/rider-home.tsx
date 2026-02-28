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
  ScrollView,
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

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/(auth)/login');
        return;
      }

      const { data: profile } = await supabase.from('riders').select('name').eq('rider_id', session.user.id).single();
      if (profile?.name) setUserName(profile.name.split(' ')[0]);

      const { data, error } = await supabase.from('ride_requests')
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

  useFocusEffect(useCallback(() => { loadData(); }, []));

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
    const fareToPass = request.estimated_fare > 0 ? request.estimated_fare : 50; 
    router.push({
      pathname: '/(tabs)/payment',
      params: { requestId: request.request_id, fare: fareToPass, pickup: request.pickup_location, destination: request.destination },
    });
  };

  const renderRequest = ({ item }) => {
    const status = item.request_status.toLowerCase();
    const isCompleted = status === 'completed';
    const isPaid = status === 'paid';
    
    let statusColor = '#EF4444'; 
    if (status === 'accepted') statusColor = '#3B82F6'; 
    if (isCompleted || isPaid) statusColor = '#10B981'; 

    const dateObj = new Date(item.ride_date || item.created_at);
    const prettyDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{prettyDate}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <Ionicons name="location" size={20} color="#7C3AED" />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.pickup_location} <Text style={{color: '#64748B'}}>→</Text> {item.destination}
          </Text>
        </View>

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
      {/* Dashboard Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName}!</Text>
          <Text style={styles.subGreeting}>Rider Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={item => item.request_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#7C3AED" />}
        contentContainerStyle={{ paddingBottom: 40 }}
        
        // The Top Section of the Dashboard (Action Cards)
        ListHeaderComponent={
          <View style={styles.dashboardTop}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/create-request')}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
                <Ionicons name="car-sport" size={32} color="#7C3AED" />
              </View>
              <View style={styles.actionCardText}>
                <Text style={styles.actionCardTitle}>Book a Ride</Text>
                <Text style={styles.actionCardDesc}>Create a new carpool request</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Recent Trips</Text>
          </View>
        }

        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color="#1E293B" style={{marginBottom: 20}} />
            <Text style={styles.emptyText}>You haven't requested any rides yet.</Text>
          </View>
        }
        renderItem={renderRequest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 20 },
  greeting: { fontSize: 32, fontWeight: '900', color: '#F8FAFC' },
  subGreeting: { fontSize: 16, color: '#94A3B8', marginTop: 4, fontWeight: '500' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  dashboardTop: { paddingHorizontal: 20, marginBottom: 10 },
  actionCard: { backgroundColor: '#1E293B', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
  iconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionCardText: { flex: 1 },
  actionCardTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  actionCardDesc: { fontSize: 13, color: '#94A3B8' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#F8FAFC', marginTop: 20, marginBottom: 10, paddingLeft: 4 },

  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748B', fontSize: 16 },
  
  card: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.15)' },
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
});