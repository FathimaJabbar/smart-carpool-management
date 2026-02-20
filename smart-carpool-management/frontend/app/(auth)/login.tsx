import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';

// 1. Define your theme colors
const COLORS = {
  bg: '#FFFFFF',      // Background
  text: '#111827',    // Dark text
  muted: '#6B7280',   // Gray sub-text
  card: '#F3F4F6',    // Input background
  accent: '#10B981',  // Main button (Greenish)
  primary: '#3B82F6', // Links/Secondary (Blue)
};

export default function Login() {
  const router = useRouter();
  
  // 2. State management for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        
        {/* Header Section */}
        <Text style={styles.header}>Welcome Back</Text>
        <Text style={styles.sub}>Sign in to continue your journey</Text>

        {/* Input Fields */}
        <TextInput 
          placeholder="Email" 
          placeholderTextColor={COLORS.muted}
          style={styles.input} 
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput 
          placeholder="Password" 
          placeholderTextColor={COLORS.muted}
          secureTextEntry 
          style={styles.input} 
          value={password}
          onChangeText={setPassword}
        />

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.push('/(driver)/dashboard')}
        >
          <Text style={styles.btnText}>Login as Driver (Demo)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLORS.primary, marginTop: 12 }]}
          onPress={() => router.push('/(rider)/dashboard')}
        >
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Login as Rider (Demo)</Text>
        </TouchableOpacity>

        {/* Registration Link */}
        <TouchableOpacity 
          style={styles.link}
          onPress={() => router.push('/register')} 
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={{ fontWeight: '800' }}>Register</Text>
          </Text>
        </TouchableOpacity>
        
      </View>
    </SafeAreaView>
  );
}

// 3. Stylesheet using the COLORS object
const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: COLORS.bg,
    padding: 28
  },
  header: {
    fontSize: 34,
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 4
  },
  sub: {
    color: COLORS.muted,
    fontSize: 16,
    marginBottom: 28
  },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    fontSize: 16
  },
  btn: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 14,
    marginTop: 6
  },
  btnText: {
    color: "#052E16",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700"
  },
  link: { 
    marginTop: 24 
  },
  linkText: {
    color: COLORS.primary,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600"
  }
});