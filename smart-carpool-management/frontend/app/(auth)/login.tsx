import { SafeAreaView } from 'react-native-safe-area-context';


 import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  SlideInDown,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useGlobalAlert } from '@/components/GlobalAlert';

export default function Index() {
  const router = useRouter();
  const { showAlert } = useGlobalAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 1000 });
  }, []);
<SafeAreaView style={styles.safe}>
  <View style={styles.container}>
    <Text style={styles.title}>Smart Carpool</Text>
    ...
  </View>
</SafeAreaView>
  const animatedBg = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));


const handleLogin = async () => {
  if (!email.trim() || !password.trim()) {
    showAlert('Error', 'Please enter email and password', 'error');
    return;
  }

  try {
    setLoading(true);

    // 🔐 Real Supabase Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showAlert('Login Failed', error.message, 'error');
      return;
    }

    const user = data.user;
    if (!user) {
      showAlert('Error', 'User not found', 'error');
      return;
    }

    // 🔎 Check if user exists in drivers table
    const { data: driver } = await supabase
      .from('drivers')
      .select('driver_id')
      .eq('driver_id', user.id)
      .single();

    if (driver) {
      // 🚗 Go to Driver Home
      router.replace('/(tabs)/driver-home');
    } else {
      // 🧍 Go to Rider Home
      router.replace('/(tabs)/rider-home');
    }

  } catch (err) {
    showAlert('Login Failed', 'Something went wrong', 'error');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      {/* Background fade-in */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.gradientBg, animatedBg]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.content}>
          {/* Title + subtitle entrance */}
          <Animated.View entering={FadeInDown.duration(800)}>
            <Text style={styles.title}>Smart Carpool</Text>
            <Text style={styles.subtitle}></Text>
          </Animated.View>

          {/* Glass card with slide entrance */}
          <Animated.View
            entering={SlideInDown.duration(900).delay(200)}
            style={styles.cardContainer}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 70 : 110}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.glassContent}>
              {/* Email */}
              <View style={styles.inputWrapper}>
                <Text
                  style={[
                    styles.floatingLabel,
                    (emailFocused || email.trim().length > 0) && styles.floatingLabelActive,
                  ]}
                >
                  Email
                </Text>
                <TextInput
                  placeholder=""  // ← empty on purpose
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.input,
                    emailFocused && styles.inputFocused,
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Text
                  style={[
                    styles.floatingLabel,
                    (passwordFocused || password.trim().length > 0) && styles.floatingLabelActive,
                  ]}
                >
                  Password
                </Text>
                <TextInput
                  placeholder=""  // ← empty on purpose
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  style={[
                    styles.input,
                    passwordFocused && styles.inputFocused,
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  autoCorrect={false}
                />
              </View>

              {/* Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonLoading]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Logging in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Register link */}
              <TouchableOpacity
                style={styles.link}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.linkText}>
                  Don't have an account? <Text style={styles.linkHighlight}>Register</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:0,
  },
  gradientBg: {
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 34,
    fontFamily:'Inter-Bold',
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.4,
    marginBottom: 8,
    padding:5,
  },
  subtitle: {
    fontSize: 17,
    color: '#94A3B8',
    marginBottom: 44,
  },
  cardContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 41, 59, 0.45)', // fallback
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  glassContent: {
    padding: 32,
    paddingTop: 50,
    paddingBottom: 50,
  },
  inputWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: 20,
    top: 18,
    fontSize: 16,
    color: '#94A3B8',
    pointerEvents: 'none',
    zIndex: 1,
  },
  floatingLabelActive: {
    top: 8,
    fontSize: 13,
    color: '#22C55E',
    // Optional: add background "cut" if border overlaps label too much
    // backgroundColor: '#0F172A',
    // paddingHorizontal: 6,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    color: '#F1F5F9',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  inputFocused: {
    borderColor: '#0ed42c',
    borderWidth: 1.2,
    shadowColor: '#000002',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  button: {
    backgroundColor: '#22C55E',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonLoading: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#052E16',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  link: {
    marginTop: 28,
    alignItems: 'center',
  },
  linkText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  linkHighlight: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});