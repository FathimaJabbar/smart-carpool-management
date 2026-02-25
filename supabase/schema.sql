-- ============================================================================
-- Smart Carpool Management - Supabase Schema
-- ============================================================================

-- ============================================================================
-- Users & Profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('rider', 'driver')),
  full_name TEXT,
  phone_number TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- Driver Information
-- ============================================================================

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT,
  vehicle_model TEXT,
  license_number TEXT UNIQUE,
  insurance_expiry DATE,
  rating FLOAT DEFAULT 4.5,
  total_trips INT DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  bank_account TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can read their own info" ON drivers
  FOR SELECT USING (auth.uid() = id);

-- ============================================================================
-- Ride Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pickup_location TEXT NOT NULL,
  pickup_latitude FLOAT,
  pickup_longitude FLOAT,
  destination TEXT NOT NULL,
  destination_latitude FLOAT,
  destination_longitude FLOAT,
  seats_required INT NOT NULL CHECK (seats_required >= 1),
  request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'accepted', 'completed', 'cancelled')),
  estimated_fare DECIMAL(10, 2),
  estimated_distance FLOAT,
  estimated_duration INT, -- in minutes
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ride_requests_rider ON ride_requests(rider_id);
CREATE INDEX idx_ride_requests_status ON ride_requests(request_status);
CREATE INDEX idx_ride_requests_ride ON ride_requests(ride_id);

ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders can read their own requests" ON ride_requests
  FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can create requests" ON ride_requests
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

-- ============================================================================
-- Rides (Active Trips)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  ride_requests JSONB DEFAULT '[]'::jsonb, -- stores array of {request_id, rider_id, seats}
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  fare DECIMAL(10, 2),
  distance_km FLOAT,
  duration_minutes INT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can read their own rides" ON rides
  FOR SELECT USING (auth.uid() = driver_id);

-- ============================================================================
-- Ratings & Reviews
-- ============================================================================

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ratings_ride ON ratings(ride_id);
CREATE INDEX idx_ratings_ratee ON ratings(ratee_id);

-- ============================================================================
-- Payments
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_ride ON payments(ride_id);
CREATE INDEX idx_payments_rider ON payments(rider_id);
CREATE INDEX idx_payments_driver ON payments(driver_id);

-- ============================================================================
-- Enable Real-time Subscriptions
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE rides;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
