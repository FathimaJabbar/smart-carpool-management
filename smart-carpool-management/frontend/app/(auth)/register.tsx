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
import { Ionicons } from '@expo/vector-icons';
import { useGlobalAlert } from '@/components/GlobalAlert'; // <-- Imported Global Alert!

export default function Register() {
  const [role, setRole] = useState('rider'); 
  const [loading, setLoading] = useState(false);
  const { showAlert } = useGlobalAlert(); // <-- Initialized Hook

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Driver fields
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const [license, setLicense] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      showAlert('Missing Details', 'Please fill all basic details', 'error');
      return;
    }

    if (role === 'driver') {
      if (!vehicleModel.trim() || !vehicleNumber.trim() || !capacity.trim() || !license.trim()) {
        showAlert('Missing Details', 'Please fill all vehicle and license details', 'error');
        return;
      }
      const seating = Number(capacity);
      if (isNaN(seating) || seating < 1) {
        showAlert('Invalid Capacity', 'Seating capacity must be a valid number ≥ 1', 'error');
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
        showAlert('Registration Failed', signUpError?.message || 'Sign up failed', 'error');
        setLoading(false);
        return;
      }

      const userId = user.id;

      if (role === 'driver') {
        const { error: driverErr } = await supabase.from('drivers').insert({
          driver_id: userId, name: name.trim(), email: email.trim(), phone: phone.trim(), license_number: license.trim().toUpperCase(),
        });
        if (driverErr) throw driverErr;

        const { error: vehicleErr } = await supabase.from('vehicles').insert({
          driver_id: userId, vehicle_model: vehicleModel.trim(), vehicle_number: vehicleNumber.trim().toUpperCase(), seating_capacity: Number(capacity),
        });
        if (vehicleErr) throw vehicleErr;
        
      } else {
        const { error: riderErr } = await supabase.from('riders').insert({
          rider_id: userId, name: name.trim(), email: email.trim(), phone: phone.trim(),
        });
        if (riderErr) throw riderErr;
      }

      // Premium Success Alert with Redirect Callback
      showAlert('Welcome Aboard!', 'Registration successful! You can now log in.', 'success', () => {
        router.replace('/(auth)/login');
      });
      
    } catch (err: any) {
      console.error('Registration error:', err);
      showAlert('Error', err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the smart commute today</Text>
          </View>

          <View style={styles.roleContainer}>
            <TouchableOpacity style={[styles.roleButton, role === 'rider' && styles.roleButtonActive]} onPress={() => setRole('rider')}>
              <Ionicons name="person" size={18} color={role === 'rider' ? '#FFF' : '#64748B'} />
              <Text style={[styles.roleText, role === 'rider' && styles.roleTextActive]}>Rider</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleButton, role === 'driver' && styles.roleButtonActive]} onPress={() => setRole('driver')}>
              <Ionicons name="car" size={18} color={role === 'driver' ? '#FFF' : '#64748B'} />
              <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>Driver</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputWrapper}><Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor="#64748B" autoCapitalize="words" /></View>
            <View style={styles.inputWrapper}><Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#64748B" /></View>
            <View style={styles.inputWrapper}><Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#64748B" /></View>
            <View style={styles.inputWrapper}><Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#64748B" /></View>
          </View>

          {role === 'driver' && (
            <View style={styles.driverSection}>
              <Text style={styles.sectionTitle}>Verification & Vehicle</Text>
              <View style={styles.inputWrapper}><Ionicons name="card-outline" size={20} color="#7C3AED" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Driver License No." value={license} onChangeText={setLicense} autoCapitalize="characters" placeholderTextColor="#64748B" /></View>
              <View style={styles.inputWrapper}><Ionicons name="car-sport-outline" size={20} color="#7C3AED" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Vehicle Model (e.g. Swift)" value={vehicleModel} onChangeText={setVehicleModel} placeholderTextColor="#64748B" /></View>
              <View style={styles.inputWrapper}><Ionicons name="reader-outline" size={20} color="#7C3AED" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Reg Number (e.g. KL07 AB 1234)" value={vehicleNumber} onChangeText={setVehicleNumber} autoCapitalize="characters" placeholderTextColor="#64748B" /></View>
              <View style={styles.inputWrapper}><Ionicons name="people-circle-outline" size={20} color="#7C3AED" style={styles.inputIcon} /><TextInput style={styles.input} placeholder="Seating Capacity (e.g. 4)" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholderTextColor="#64748B" /></View>
            </View>
          )}

          <TouchableOpacity style={[styles.registerButton, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.registerButtonText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}><Text style={styles.loginLinkBold}>Log in</Text></TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1120' }, keyboardAvoid: { flex: 1 }, scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 60 },
  headerContainer: { marginBottom: 30, alignItems: 'center' }, title: { fontSize: 32, fontWeight: '900', color: '#F8FAFC', letterSpacing: 0.5 }, subtitle: { color: '#94A3B8', fontSize: 15, marginTop: 8 },
  roleContainer: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 20, padding: 6, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  roleButton: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  roleButtonActive: { backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  roleText: { color: '#64748B', fontSize: 16, fontWeight: '700', marginLeft: 8 }, roleTextActive: { color: '#FFFFFF' },
  inputGroup: { marginBottom: 10 }, inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
  inputIcon: { marginRight: 12 }, input: { flex: 1, color: '#F8FAFC', paddingVertical: 16, fontSize: 16 },
  driverSection: { backgroundColor: 'rgba(124, 58, 237, 0.05)', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.2)' },
  sectionTitle: { color: '#A78BFA', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  registerButton: { backgroundColor: '#7C3AED', paddingVertical: 18, borderRadius: 18, alignItems: 'center', marginTop: 10, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  buttonDisabled: { opacity: 0.7 }, registerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 }, footerText: { color: '#94A3B8', fontSize: 15 }, loginLinkBold: { color: '#A78BFA', fontSize: 15, fontWeight: '700' },
});