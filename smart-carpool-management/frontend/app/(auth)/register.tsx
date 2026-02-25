// app/(auth)/register.tsx (full updated file)
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('rider'); // 'rider' or 'driver'
  const [loading, setLoading] = useState(false);

  // Driver fields
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [capacity, setCapacity] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      alert('Please fill all required fields');
      return;
    }

    if (role === 'driver') {
      if (!vehicleModel.trim() || !vehicleNumber.trim() || !capacity.trim()) {
        alert('Please fill all vehicle details');
        return;
      }
      const seating = Number(capacity);
      if (isNaN(seating) || seating < 1) {
        alert('Seating capacity must be a valid number ≥ 1');
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError || !user) {
        alert(signUpError?.message || 'Sign up failed');
        setLoading(false);
        return;
      }

      const userId = user.id;

      if (role === 'driver') {
        // Driver profile
        const { error: driverErr } = await supabase.from('drivers').insert({
          driver_id: userId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        });

        if (driverErr) throw driverErr;

        // Vehicle
        const { error: vehicleErr } = await supabase.from('vehicles').insert({
          driver_id: userId,
          vehicle_model: vehicleModel.trim(),
          vehicle_number: vehicleNumber.trim().toUpperCase(),
          seating_capacity: Number(capacity),
        });

        if (vehicleErr) throw vehicleErr;
      } else {
        // Rider profile
        const { error: riderErr } = await supabase.from('riders').insert({
          rider_id: userId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        });

        if (riderErr) throw riderErr;
      }

      alert('Registration successful! Please check your email to verify.');
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('Registration error:', err);
      alert(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Register</Text>

          {/* Common fields */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#94A3B8"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#94A3B8"
          />

          {/* Role selection */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'rider' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('rider')}
            >
              <Text style={[
                styles.roleText,
                role === 'rider' && styles.roleTextActive,
              ]}>
                Rider
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'driver' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('driver')}
            >
              <Text style={[
                styles.roleText,
                role === 'driver' && styles.roleTextActive,
              ]}>
                Driver
              </Text>
            </TouchableOpacity>
          </View>

          {/* Driver fields - shown conditionally */}
          {role === 'driver' && (
            <View style={styles.driverFields}>
              <TextInput
                style={styles.input}
                placeholder="Vehicle Model (e.g. Swift Dzire)"
                value={vehicleModel}
                onChangeText={setVehicleModel}
                placeholderTextColor="#94A3B8"
              />

              <TextInput
                style={styles.input}
                placeholder="Vehicle Number (e.g. KL07 AB 1234)"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                autoCapitalize="characters"
                placeholderTextColor="#94A3B8"
              />

              <TextInput
                style={styles.input}
                placeholder="Seating Capacity"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}

          {/* Register button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity
            style={styles.loginLinkContainer}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 48,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 6,
    marginBottom: 28,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#7C3AED',
  },
  roleText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  driverFields: {
    marginBottom: 28,
  },
  registerButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loginLinkContainer: {
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  loginLinkBold: {
    color: '#7C3AED',
    fontWeight: '700',
  },
});