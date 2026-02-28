// app/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          // Not logged in → go to login
          setRedirectTo('/(auth)/login');
          return;
        }

        // Logged in → check role from profiles (or user metadata)
        const userId = session.user.id;

        // Option 1: Check riders table
        const { data: rider } = await supabase
          .from('riders')
          .select('rider_id')
          .eq('rider_id', userId)
          .single();

        if (rider) {
          setRedirectTo('/(tabs)/rider-home');
          return;
        }

        // Option 2: Check drivers table
        const { data: driver } = await supabase
          .from('drivers')
          .select('driver_id')
          .eq('driver_id', userId)
          .single();

        if (driver) {
          setRedirectTo('/(tabs)/driver-home');
          return;
        }

        // Fallback: no profile found → force login or onboarding
        setRedirectTo('/(auth)/login');
      } catch (err) {
        console.error('Index auth check error:', err);
        setRedirectTo('/(auth)/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.splashText}>Loading Smart Carpool...</Text>
      </View>
    );
  }

  if (redirectTo) {
    return <Redirect href={redirectTo} />;
  }

  // Fallback (should never reach here)
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0B1120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    color: '#F8FAFC',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
});