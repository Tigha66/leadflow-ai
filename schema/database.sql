-- LeadFlow AI Database Schema

-- Users table (business owners)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100), -- dentist, roofer, hvac, etc
  phone VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'UTC',
  stripe_customer_id VARCHAR(255),
  subscription_tier VARCHAR(20) DEFAULT 'starter', -- starter, growth, pro
  subscription_status VARCHAR(20) DEFAULT 'trial', -- trial, active, cancelled
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Businesses table (for multi-location support)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  operating_hours JSONB, -- {monday: {open: "9:00", close: "17:00"}, ...}
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendars table (for appointment scheduling)
CREATE TABLE calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  google_calendar_id VARCHAR(255), -- Google Calendar ID
  name VARCHAR(255) DEFAULT 'Main Calendar',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services offered by businesses
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads/Prospects table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  service_interest VARCHAR(255), -- specific service they're interested in
  source VARCHAR(50) DEFAULT 'web', -- web, sms, whatsapp, missed_call
  status VARCHAR(20) DEFAULT 'new', -- new, contacted, qualified, booked, closed_lost
  lead_value DECIMAL(10, 2), -- estimated value of lead
  conversation_history JSONB, -- array of conversation objects
  last_contacted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, confirmed, rescheduled, cancelled, completed
  confirmation_sent BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table (individual chat sessions)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, resolved, transferred_to_human
  ai_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table (individual messages in conversations)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL, -- lead, business, ai
  sender_id UUID, -- reference to user/business/lead
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, appointment_confirmation
  delivered BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follow-up sequences table
CREATE TABLE follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(50) NOT NULL, -- no_response, quote_given, missed_appointment
  delay_minutes INTEGER NOT NULL, -- when to send the follow-up
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled follow-ups table
CREATE TABLE scheduled_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follow_up_sequence_id UUID REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business settings table
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  auto_reply_enabled BOOLEAN DEFAULT TRUE,
  follow_up_enabled BOOLEAN DEFAULT TRUE,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '17:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  ai_personality TEXT DEFAULT 'friendly_professional', -- friendly_professional, formal, casual
  custom_responses JSONB, -- custom AI responses per business type
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage analytics table
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- leads_captured, response_time, booking_rate, etc
  value DECIMAL(12, 2),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table (for integrations)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  key_type VARCHAR(50) NOT NULL, -- twilio, whatsapp, google_calendar, stripe
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_leads_business_id ON leads(business_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_scheduled_follow_ups_scheduled_for ON scheduled_follow_ups(scheduled_for);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);

-- Functions for business logic

-- Function to calculate lead conversion rate
CREATE OR REPLACE FUNCTION calculate_conversion_rate(business_id_param UUID) 
RETURNS DECIMAL AS $$
DECLARE
  total_leads INTEGER;
  converted_leads INTEGER;
  conversion_rate DECIMAL;
BEGIN
  SELECT COUNT(*) INTO total_leads FROM leads WHERE business_id = business_id_param;
  SELECT COUNT(*) INTO converted_leads FROM leads WHERE business_id = business_id_param AND status = 'booked';
  
  IF total_leads = 0 THEN
    RETURN 0;
  END IF;
  
  conversion_rate := (converted_leads::DECIMAL / total_leads::DECIMAL) * 100;
  RETURN conversion_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get average response time
CREATE OR REPLACE FUNCTION get_avg_response_time(business_id_param UUID) 
RETURNS INTERVAL AS $$
DECLARE
  avg_time INTERVAL;
BEGIN
  SELECT AVG(m1.created_at - m2.created_at) INTO avg_time
  FROM messages m1
  JOIN messages m2 ON m1.conversation_id = m2.conversation_id
  WHERE m1.sender_type = 'business' 
    AND m2.sender_type = 'lead'
    AND m1.created_at > m2.created_at
    AND EXISTS (
      SELECT 1 FROM leads l 
      WHERE l.id = (SELECT lead_id FROM conversations c WHERE c.id = m1.conversation_id LIMIT 1)
      AND l.business_id = business_id_param
    )
  LIMIT 100; -- Limit to prevent long queries
  
  RETURN avg_time;
END;
$$ LANGUAGE plpgsql;
