import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import Modal from "react-native-modal";
import MapView, { Marker, Polyline } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const GEOCODE_API_KEY = "69995081002b9123938436hzj710469";
const { width, height } = Dimensions.get("window");

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0B1120" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94A3B8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B1120" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E293B" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
];

// Premium Custom Alert
const CustomAlert = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");

  const show = (t, m, alertType = "info") => {
    setTitle(t);
    setMessage(m);
    setType(alertType);
    setVisible(true);
  };

  const hide = () => setVisible(false);

  useImperativeHandle(ref, () => ({ show, hide }));

  const getColor = () => {
    switch (type) {
      case "success": return "#10B981";
      case "error": return "#EF4444";
      default: return "#7C3AED";
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={hide}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      backdropOpacity={0.7}
      style={styles.modal}
    >
      <BlurView intensity={120} tint="dark" style={styles.alertContainer}>
        <View style={styles.alertContent}>
          <View style={[styles.alertIcon, { backgroundColor: getColor() + '20' }]}>
             <Ionicons name={type === 'success' ? 'checkmark' : 'alert'} size={32} color={getColor()} />
          </View>
          <Text style={[styles.alertTitle, { color: getColor() }]}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>
          <TouchableOpacity
            style={[styles.alertButton, { backgroundColor: getColor() }]}
            onPress={hide}
          >
            <Text style={styles.alertButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
});

export default function CreateRequest() {
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [seats, setSeats] = useState("");
  const [estimatedFare, setEstimatedFare] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  const [routeCoords, setRouteCoords] = useState([]);
  const [pickupMarker, setPickupMarker] = useState(null);
  const [destMarker, setDestMarker] = useState(null);

  const alertRef = useRef(null);
  const mapRef = useRef(null);

  const showAlert = (title, message, type = "info") => {
    alertRef.current?.show(title, message, type);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };
    checkUser();
  }, []);

  const geocode = async (address) => {
    try {
      const query = `${address.trim()}, Kerala, India`;
      const url = `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=1&api_key=${GEOCODE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data?.length) throw new Error("Location not found");
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    } catch (err) {
      throw err;
    }
  };

  const calculateFare = async () => {
    if (!pickupLocation.trim() || !destination.trim()) {
      showAlert("Required", "Please enter both locations", "error");
      return;
    }
    setLoading(true);
    try {
      const p = await geocode(pickupLocation);
      const d = await geocode(destination);
      setPickupMarker(p);
      setDestMarker(d);

      const url = `http://router.project-osrm.org/route/v1/driving/${p.longitude},${p.latitude};${d.longitude},${d.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === "Ok") {
        const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => ({
          latitude: lat,
          longitude: lon,
        }));
        setRouteCoords(coords);
        const distanceKm = data.routes[0].distance / 1000;
        const fare = Math.round(30 + distanceKm * 8);
        setEstimatedFare(fare);
        
        mapRef.current?.fitToCoordinates([p, d], {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (err) {
      showAlert("Geocoding Error", "Could not find these locations in Kerala", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return router.replace("/(auth)/login");
    if (!pickupLocation || !destination || !seats) {
      showAlert("Missing Data", "Please fill in all fields", "error");
      return;
    }

    setLoading(true);
    try {
      // POINT 1 FIX:ride_date is now ISO String (System Date)
      const { error } = await supabase.from("ride_requests").insert({
        rider_id: userId,
        pickup_location: pickupLocation.trim(),
        destination: destination.trim(),
        seats_required: parseInt(seats),
        request_status: "pending",
        ride_date: new Date().toISOString(), 
        estimated_fare: estimatedFare,
      });

      if (error) throw error;

      // POINT 6 FIX: Alert + Redirect to Home
      Alert.alert("Request Sent", "Your carpool request is now live.", [
        { text: "View Home", onPress: () => router.replace("/(tabs)/rider-home") }
      ]);
    } catch (err) {
      showAlert("Database Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            customMapStyle={darkMapStyle}
            initialRegion={{
              latitude: 10.8505,
              longitude: 76.2711,
              latitudeDelta: 3,
              longitudeDelta: 3,
            }}
          >
            {pickupMarker && <Marker coordinate={pickupMarker} title="Pickup" pinColor="#7C3AED" />}
            {destMarker && <Marker coordinate={destMarker} title="Drop-off" pinColor="#EF4444" />}
            {routeCoords.length > 0 && (
              <Polyline coordinates={routeCoords} strokeColor="#7C3AED" strokeWidth={5} />
            )}
          </MapView>

          <View style={styles.overlay}>
             <BlurView intensity={80} tint="dark" style={styles.formCard}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Animated.Text entering={FadeInUp} style={styles.title}>Create Ride</Animated.Text>
                  
                  <View style={styles.inputWrapper}>
                    <Ionicons name="location-outline" size={20} color="#7C3AED" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Pickup Point"
                      placeholderTextColor="#64748B"
                      style={styles.input}
                      value={pickupLocation}
                      onChangeText={setPickupLocation}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="flag-outline" size={20} color="#EF4444" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Destination"
                      placeholderTextColor="#64748B"
                      style={styles.input}
                      value={destination}
                      onChangeText={setDestination}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="people-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Seats Needed"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                      style={styles.input}
                      value={seats}
                      onChangeText={setSeats}
                    />
                  </View>

                  <TouchableOpacity style={styles.calcBtn} onPress={calculateFare}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.calcBtnText}>Calculate Fare</Text>}
                  </TouchableOpacity>

                  {estimatedFare > 0 && (
                    <Animated.View entering={FadeInDown} style={styles.fareContainer}>
                      <Text style={styles.fareLabel}>Estimated Total</Text>
                      <Text style={styles.fareValue}>₹{estimatedFare}</Text>
                    </Animated.View>
                  )}

                  <TouchableOpacity 
                    style={[styles.submitBtn, !estimatedFare && { opacity: 0.5 }]} 
                    onPress={handleSubmit}
                    disabled={!estimatedFare || loading}
                  >
                    <Text style={styles.submitBtnText}>Confirm Request</Text>
                  </TouchableOpacity>
                </ScrollView>
             </BlurView>
          </View>
        </View>
      </KeyboardAvoidingView>
      <CustomAlert ref={alertRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1120" },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
  },
  formCard: {
    borderRadius: 30,
    padding: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: height * 0.6,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#F8FAFC", marginBottom: 20, textAlign: 'center' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 15,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: "#F1F5F9", fontSize: 15 },
  calcBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  calcBtnText: { color: "#A78BFA", fontWeight: "700" },
  fareContainer: { alignItems: 'center', marginVertical: 20 },
  fareLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  fareValue: { color: "#10B981", fontSize: 36, fontWeight: "900" },
  submitBtn: {
    backgroundColor: "#7C3AED",
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#7C3AED",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  modal: { margin: 20, justifyContent: "center" },
  alertContainer: { borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  alertContent: { padding: 30, alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.9)' },
  alertIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  alertTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  alertMessage: { color: "#94A3B8", textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  alertButton: { width: '100%', height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  alertButtonText: { color: "#FFF", fontWeight: "700" },
});