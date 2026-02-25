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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import Modal from "react-native-modal";
import MapView, { Marker, Polyline } from "react-native-maps";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// Geocode API Key
const GEOCODE_API_KEY = "69995081002b9123938436hzj710469";

// Dark map style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0B1120" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94A3B8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B1120" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E293B" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
];

const { width, height } = Dimensions.get("window");

// Premium Alert Component
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
      case "error":   return "#EF4444";
      default:        return "#7C3AED";
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={hide}
      onBackButtonPress={hide}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      backdropOpacity={0.7}
      useNativeDriver
      style={styles.modal}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 80 : 120}
        tint="dark"
        style={styles.alertContainer}
      >
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, { color: getColor() }]}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          <TouchableOpacity
            style={[styles.alertButton, { backgroundColor: getColor() }]}
            onPress={hide}
            activeOpacity={0.8}
          >
            <Text style={styles.alertButtonText}>OK</Text>
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
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Map states
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [pickupMarker, setPickupMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destMarker, setDestMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  const baseFare = 30;
  const ratePerKm = 8;

  const alertRef = useRef(null);

  const showAlert = (title: string, message: string, type = "info") => {
    alertRef.current?.show(title, message, type);
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
        } else {
          showAlert("Login Required", "Please sign in to create requests", "error");
          router.replace("/(auth)/login");
        }
      } catch (err) {
        console.error("Session load error:", err);
        showAlert("Error", "Could not verify login status", "error");
      } finally {
        setAuthLoading(false);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      if (!session?.user) router.replace("/(auth)/login");
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const geocode = async (address: string) => {
    if (!GEOCODE_API_KEY) throw new Error("Geocoding key missing");

    try {
      const query = `${address.trim()}, Kerala, India`;
      const url = `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=1&api_key=${GEOCODE_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Geocode failed (HTTP ${response.status})`);

      const data = await response.json();
      if (!data?.length) throw new Error("Location not found");

      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (err) {
      console.error("Geocode failed:", err);
      throw err;
    }
  };

  const haversineKm = (c1: { lat: number; lon: number }, c2: { lat: number; lon: number }) => {
    const R = 6371;
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLon = (c2.lon - c1.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(c1.lat * Math.PI/180) * Math.cos(c2.lat * Math.PI/180) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateFare = async () => {
    if (!pickupLocation.trim() || !destination.trim()) {
      showAlert("Missing Fields", "Enter pickup and destination", "error");
      return;
    }

    setLoading(true);
    setEstimatedFare(0);
    setRouteCoords([]);
    setPickupMarker(null);
    setDestMarker(null);

    try {
      const pickupCoord = await geocode(pickupLocation);
      const destCoord = await geocode(destination);

      setPickupMarker({ latitude: pickupCoord.lat, longitude: pickupCoord.lon });
      setDestMarker({ latitude: destCoord.lat, longitude: destCoord.lon });

      let distanceKm = 12;

      try {
        const url = `http://router.project-osrm.org/route/v1/driving/${pickupCoord.lon},${pickupCoord.lat};${destCoord.lon},${destCoord.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === "Ok" && data.routes?.[0]?.geometry) {
          const coords = data.routes[0].geometry.coordinates.map(([lon, lat]: [number, number]) => ({
            latitude: lat,
            longitude: lon,
          }));
          setRouteCoords(coords);
          distanceKm = data.routes[0].distance / 1000;
        } else {
          distanceKm = haversineKm(pickupCoord, destCoord);
          setRouteCoords([pickupMarker, destMarker].filter(Boolean));
        }
      } catch {
        distanceKm = haversineKm(pickupCoord, destCoord);
        setRouteCoords([pickupMarker, destMarker].filter(Boolean));
      }

      const calculated = baseFare + distanceKm * ratePerKm;
      const rounded = Math.round(calculated);
      setEstimatedFare(rounded);

      showAlert("Fare Ready", `≈ ${distanceKm.toFixed(1)} km\n₹${rounded}`, "success");
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to calculate fare", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      showAlert("Not Logged In", "Please sign in first", "error");
      router.replace("/(auth)/login");
      return;
    }

    if (!pickupLocation.trim() || !destination.trim() || !seats.trim()) {
      showAlert("Incomplete", "Fill all required fields", "error");
      return;
    }

    const seatsNum = Number(seats);
    if (isNaN(seatsNum) || seatsNum < 1) {
      showAlert("Invalid", "Seats must be ≥ 1", "error");
      return;
    }

    setLoading(true);

    try {
      // Insert request with auto-generated ride_date (today's date)
      const { data: request, error } = await supabase
        .from("ride_requests")
        .insert({
          rider_id: userId,
          pickup_location: pickupLocation.trim(),
          destination: destination.trim(),
          seats_required: seatsNum,
          request_status: "pending",
          ride_date: new Date().toISOString().split("T")[0],  // ← Auto system date (YYYY-MM-DD)
        })
        .select("request_id")
        .single();

      if (error) throw error;

      showAlert("Success", "Request created!\nRedirecting to payment...", "success");

      // In handleSubmit — replace the router.push block with this:
Alert.alert(
  "Success",
  "Ride request created!\nWaiting for drivers to accept your request.",
  [
    {
      text: "OK",
      onPress: () => {
        router.replace('/(tabs)/rider-home');
      },
    },
  ]
);

      // Reset form after navigation
      setPickupLocation("");
      setDestination("");
      setSeats("");
      setEstimatedFare(0);
      setRouteCoords([]);
      setPickupMarker(null);
      setDestMarker(null);
    } catch (err: any) {
      console.error("Insert failed:", err);
      let msg = err.message || "Could not create request";
      if (err.code === "23503") {
        msg = "Rider profile missing. Please complete registration or contact support.";
      } else if (err.code === "PGRST204") {
        msg = "Database schema mismatch. Check column names.";
      }
      showAlert("Failed", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={{ color: "#94A3B8", marginTop: 16 }}>Checking login...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          customMapStyle={darkMapStyle}
          initialRegion={{
            latitude: 9.9312,
            longitude: 76.2673,
            latitudeDelta: 0.4,
            longitudeDelta: 0.4,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {pickupMarker && <Marker coordinate={pickupMarker} pinColor="#7C3AED" title="Pickup" />}
          {destMarker && <Marker coordinate={destMarker} pinColor="#EF4444" title="Destination" />}
          {routeCoords.length > 1 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#7C3AED"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>

        <BlurView intensity={Platform.OS === "ios" ? 90 : 130} tint="dark" style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.formContainer}>
            <Text style={styles.title}>Create Travel Request</Text>

            <TextInput
              placeholder="Pickup (e.g. Edappally, Kochi)"
              style={styles.input}
              value={pickupLocation}
              onChangeText={setPickupLocation}
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />

            <TextInput
              placeholder="Destination (e.g. Infopark Phase 1)"
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />

            <TextInput
              placeholder="Seats Required"
              style={styles.input}
              keyboardType="number-pad"
              value={seats}
              onChangeText={setSeats}
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={calculateFare}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="calculator-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Calculate Fare</Text>
                </>
              )}
            </TouchableOpacity>

            {estimatedFare > 0 && <Text style={styles.fare}>Estimated Fare: ₹{estimatedFare}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Submit Request</Text>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </View>

      <CustomAlert ref={alertRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1120" },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  formContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: "rgba(11, 17, 32, 0.70)",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    color: "#F1F5F9",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  button: {
    backgroundColor: "#7C3AED",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: "#6D28D9",
    opacity: 0.7,
  },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  fare: {
    color: "#10B981",
    fontSize: 20,
    fontWeight: "700",
    marginVertical: 24,
    textAlign: "center",
  },

  modal: { justifyContent: "center", margin: 0 },
  alertContainer: {
    borderRadius: 24,
    overflow: "hidden",
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  alertContent: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
  },
  alertTitle: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  alertMessage: { fontSize: 16, color: "#D1D5DB", textAlign: "center", marginBottom: 28, lineHeight: 24 },
  alertButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
    minWidth: 140,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  alertButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});