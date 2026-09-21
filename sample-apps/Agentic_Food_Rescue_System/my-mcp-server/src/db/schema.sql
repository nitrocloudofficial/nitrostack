CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
CREATE TYPE preferred_language_enum AS ENUM ('ta', 'hi', 'en', 'te');
CREATE TYPE veg_nonveg_enum AS ENUM ('veg', 'nonveg');
CREATE TYPE donation_status_enum AS ENUM ('pending', 'matching', 'partially_allocated', 'fully_allocated', 'completed', 'unfulfilled');
CREATE TYPE call_status_enum AS ENUM ('initiated', 'ringing', 'answered', 'completed', 'no_answer', 'failed');
CREATE TYPE call_response_enum AS ENUM ('yes', 'no', 'no_answer');
CREATE TYPE allocation_status_enum AS ENUM ('accepted', 'assigned', 'picked_up', 'delivered', 'confirmed', 'disputed');
CREATE TYPE delivery_status_enum AS ENUM ('requested', 'accepted', 'rejected', 'picked_up', 'delivered');
CREATE TYPE rated_type_enum AS ENUM ('restaurant', 'ngo', 'executive');

-- 1. restaurants
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    rating_avg DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. ngos
CREATE TABLE ngos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    preferred_language preferred_language_enum NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    reliability_score DOUBLE PRECISION DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    rating_avg DOUBLE PRECISION DEFAULT 0,
    capacity INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. executives
CREATE TABLE executives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    available BOOLEAN DEFAULT true,
    rating_avg DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. donations
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    food_type VARCHAR(255) NOT NULL,
    veg_nonveg veg_nonveg_enum NOT NULL,
    total_servings INT NOT NULL,
    remaining_servings INT NOT NULL,
    ready_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status donation_status_enum DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
    ngo_id UUID REFERENCES ngos(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL CHECK (attempt_number >= 1 AND attempt_number <= 3),
    language preferred_language_enum NOT NULL,
    call_status call_status_enum NOT NULL,
    response call_response_enum,
    called_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 6. allocations
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
    ngo_id UUID REFERENCES ngos(id) ON DELETE CASCADE,
    servings_accepted INT NOT NULL,
    status allocation_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 7. deliveries
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID REFERENCES allocations(id) ON DELETE CASCADE,
    executive_id UUID REFERENCES executives(id) ON DELETE SET NULL,
    status delivery_status_enum NOT NULL,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 8. ratings
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID REFERENCES allocations(id) ON DELETE CASCADE,
    rated_type rated_type_enum NOT NULL,
    rated_id UUID NOT NULL,
    score INT NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 9. logs
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
