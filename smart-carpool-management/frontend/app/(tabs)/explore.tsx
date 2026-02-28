// app/(tabs)/explore.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Explore Smart Carpool</Text>
        <Text style={styles.subtitle}>
          Share rides, save money, reduce traffic — all in Kerala
        </Text>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="location-outline" size={28} color="#7C3AED" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>1. Create a Request</Text>
              <Text style={styles.stepDesc}>
                Enter your pickup, destination, date, and seats needed.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="people-outline" size={28} color="#7C3AED" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>2. Get Matched</Text>
              <Text style={styles.stepDesc}>
                Drivers see your request (grouped with similar routes) and accept.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="car-outline" size={28} color="#7C3AED" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>3. Ride & Pay</Text>
              <Text style={styles.stepDesc}>
                Enjoy the shared ride. Pay only after the trip is completed.
              </Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features You’ll Love</Text>

          <View style={styles.feature}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#10B981" />
            <Text style={styles.featureText}>Safe & Verified Drivers</Text>
          </View>

          <View style={styles.feature}>
            <Ionicons name="cash-outline" size={24} color="#10B981" />
            <Text style={styles.featureText}>Save up to 60% on travel costs</Text>
          </View>

          <View style={styles.feature}>
            <Ionicons name="leaf-outline" size={24} color="#10B981" />
            <Text style={styles.featureText}>Reduce carbon footprint</Text>
          </View>

          <View style={styles.feature}>
            <Ionicons name="chatbubble-outline" size={24} color="#10B981" />
            <Text style={styles.featureText}>In-app chat with co-riders</Text>
          </View>
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety First</Text>
          <Text style={styles.safetyText}>
            • Only ride with verified drivers{"\n"}
            • Share your live location with family{"\n"}
            • Meet at public places{"\n"}
            • Report any issue immediately
          </Text>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/create-request')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.ctaText}>Create New Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaButton, styles.secondaryButton]}
            onPress={() => router.push('/(tabs)/explore')} // or your find-rides screen
          >
            <Ionicons name="search-outline" size={24} color="#7C3AED" />
            <Text style={[styles.ctaText, styles.secondaryText]}>Find Available Rides</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#F8FAFC',
    marginLeft: 12,
  },
  safetyText: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 24,
  },
  ctaContainer: {
    marginTop: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  secondaryText: {
    color: '#7C3AED',
  },
});