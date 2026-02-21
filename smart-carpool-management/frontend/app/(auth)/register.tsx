import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useState } from 'react';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';

export default function Register() {
  const [role, setRole] = useState<'driver' | 'rider'>('rider');

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Driver-only fields
  const [license, setLicense] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [capacity, setCapacity] = useState('');

const handleRegister = async () => {
  if (!name || !email || !password || !phone) {
    Alert.alert('Error', 'Please fill all required fields');
    return;
  }

  try {
    // 1️⃣ Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (authError) {
      Alert.alert('Auth Error', authError.message);
      return;
    }

    const userId = authData.user?.id;

    if (!userId) {
      Alert.alert('Error', 'User ID not returned');
      return;
    }

    // ======================
    // DRIVER REGISTRATION
    // ======================
    if (role === 'driver') {
      if (!license || !vehicleModel || !vehicleNumber || !capacity) {
        Alert.alert('Error', 'Please fill all driver fields');
        return;
      }

      const seating = Number(capacity);

      if (isNaN(seating)) {
        Alert.alert('Error', 'Seating capacity must be a number');
        return;
      }

      // Insert driver
      const { error: driverError } = await supabase
        .from('drivers')
        .insert({
          driver_id: userId,
          name,
          email,
          phone,
          license_number: license,
        });

      if (driverError) {
        console.log('Driver Insert Error:', driverError);
        Alert.alert('Driver Error', driverError.message);
        return;
      }

      // Insert vehicle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          driver_id: userId,
          vehicle_model: vehicleModel,
          vehicle_number: vehicleNumber,
          seating_capacity: seating,
        });

      if (vehicleError) {
        console.log('Vehicle Insert Error:', vehicleError);
        Alert.alert('Vehicle Error', vehicleError.message);
        return;
      }

      Alert.alert(
        'Success',
        'Driver registered successfully! Please verify your email before login.'
      );
      return;
    }

    // ======================
    // RIDER REGISTRATION
    // ======================
    if (role === 'rider') {
      const { error } = await supabase.from('riders').insert({
        rider_id: userId,
        name,
        email,
        phone,
      });

      if (error) {
        Alert.alert('Database Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Registration successful! Please verify your email before login.'
      );
      return;
    }
  } catch (err) {
    console.log('Unexpected Error:', err);
    Alert.alert('Unexpected Error', 'Something went wrong');
  }
};

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          
          <Animated.View entering={FadeInDown.duration(700)}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Register as {role === 'driver' ? 'Driver' : 'Rider'}
            </Text>
          </Animated.View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                role === 'rider' && styles.toggleActive,
              ]}
              onPress={() => setRole('rider')}
            >
              <Text
                style={[
                  styles.toggleText,
                  role === 'rider' && styles.toggleTextActive,
                ]}
              >
                Rider
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                role === 'driver' && styles.toggleActive,
              ]}
              onPress={() => setRole('driver')}
            >
              <Text
                style={[
                  styles.toggleText,
                  role === 'driver' && styles.toggleTextActive,
                ]}
              >
                Driver
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            entering={SlideInDown.duration(800).delay(200)}
            style={styles.card}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 110}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.form}>
              <TextInput
                placeholder="Full Name"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                placeholder="Email"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                placeholder="Password"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                placeholder="Phone Number"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
              />

              {role === 'driver' && (
                <>
                  <TextInput
                    placeholder="License Number"
                    style={styles.input}
                    value={license}
                    onChangeText={setLicense}
                  />
                  <TextInput
                    placeholder="Vehicle Model"
                    style={styles.input}
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                  />
                  <TextInput
                    placeholder="Vehicle Number"
                    style={styles.input}
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                  />
                  <TextInput
                    placeholder="Seating Capacity"
                    style={styles.input}
                    keyboardType="numeric"
                    value={capacity}
                    onChangeText={setCapacity}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
              >
                <Text style={styles.buttonText}>
                  Register as {role === 'driver' ? 'Driver' : 'Rider'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B1120' },
  container: { paddingHorizontal: 24, paddingVertical: 40 },
  title: { fontSize: 30, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  subtitle: { color: '#94A3B8', marginBottom: 30 },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    marginBottom: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#7C3AED' },
  toggleText: { color: '#94A3B8', fontWeight: '600' },
  toggleTextActive: { color: '#FFFFFF' },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  form: { padding: 28 },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});