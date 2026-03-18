-- Database Schema for Local Business Outreach Campaign

-- Table to store target businesses
CREATE TABLE target_businesses (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    business_type VARCHAR(100) NOT NULL, -- dentist, medspa, roofer, hvac, legal, plumber, electrician, etc.
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'USA',
    employees_count INTEGER, -- estimated number of employees
    monthly_revenue_estimate DECIMAL(12, 2), -- estimated monthly revenue
    primary_contact VARCHAR(100), -- name of primary contact person
    contact_title VARCHAR(100), -- title of primary contact (Owner, Manager, etc.)
    linkedin_profile VARCHAR(255), -- LinkedIn profile of decision maker if known
    source VARCHAR(100), -- how we found this business (google, yelp, bbb, etc.)
    discovery_date DATE DEFAULT CURRENT_DATE,
    last_contact_date DATE,
    contact_attempts INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'interested', 'demo_scheduled', 'converted', 'not_interested', 'invalid')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track email outreach
CREATE TABLE email_outreach (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES target_businesses(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    template_used VARCHAR(100), -- hook, pain_point, social_proof, curiosity
    subject_line VARCHAR(255),
    email_content TEXT,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened BOOLEAN DEFAULT FALSE,
    open_date TIMESTAMP,
    clicked BOOLEAN DEFAULT FALSE,
    click_date TIMESTAMP,
    replied BOOLEAN DEFAULT FALSE,
    reply_date TIMESTAMP,
    reply_content TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'clicked', 'replied', 'bounced', 'complained')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track phone outreach
CREATE TABLE phone_outreach (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES target_businesses(id) ON DELETE CASCADE,
    call_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    caller_name VARCHAR(255),
    call_type VARCHAR(50) DEFAULT 'outbound' CHECK (call_type IN ('outbound', 'inbound', 'voicemail')),
    call_result VARCHAR(50) CHECK (call_result IN ('connected', 'left_voicemail', 'no_answer', 'wrong_number', 'disconnected', 'interested', 'not_interested')),
    call_duration INTEGER, -- duration in seconds
    notes TEXT,
    next_follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for email campaigns
CREATE TABLE email_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    target_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    demo_scheduled_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking demo scheduling
CREATE TABLE demo_schedule (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES target_businesses(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP,
    duration_minutes INTEGER DEFAULT 30,
    organizer_name VARCHAR(255),
    organizer_email VARCHAR(255),
    attendee_emails TEXT[], -- array of attendee emails
    meeting_link VARCHAR(255),
    meeting_id VARCHAR(255),
    meeting_password VARCHAR(255),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'rescheduled', 'completed', 'cancelled', 'no_show')),
    feedback TEXT,
    next_steps TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_target_businesses_city_state ON target_businesses(city, state);
CREATE INDEX idx_target_businesses_type ON target_businesses(business_type);
CREATE INDEX idx_target_businesses_status ON target_businesses(status);
CREATE INDEX idx_email_outreach_business_id ON email_outreach(business_id);
CREATE INDEX idx_email_outreach_status ON email_outreach(status);
CREATE INDEX idx_phone_outreach_business_id ON phone_outreach(business_id);
CREATE INDEX idx_demo_schedule_business_id ON demo_schedule(business_id);
CREATE INDEX idx_demo_schedule_date ON demo_schedule(scheduled_date);

-- Sample data for testing
INSERT INTO target_businesses (
    business_name, 
    owner_name, 
    business_type, 
    phone, 
    email, 
    website, 
    address, 
    city, 
    state, 
    zip_code,
    employees_count,
    monthly_revenue_estimate,
    primary_contact,
    contact_title
) VALUES 
('Johnson Family Dentistry', 'Dr. Michael Johnson', 'dentist', '(555) 123-4567', 'dr.johnson@dentistry.com', 'www.johnsondentistry.com', '123 Main Street', 'Phoenix', 'AZ', '85001', 8, 85000.00, 'Dr. Michael Johnson', 'Owner'),
('Desert Oasis Med Spa', 'Sarah Williams', 'medspa', '(555) 234-5678', 'sarah@desertoasis.com', 'www.desertoasismedspa.com', '456 Wellness Blvd', 'Phoenix', 'AZ', '85002', 6, 65000.00, 'Sarah Williams', 'Founder'),
('Arizona Roof Solutions', 'Robert Davis', 'roofer', '(555) 345-6789', 'bob@arizonaroofsolutions.com', 'www.arizonaroofsolutions.com', '789 Construction Ave', 'Phoenix', 'AZ', '85003', 12, 120000.00, 'Robert Davis', 'CEO'),
('Phoenix HVAC Experts', 'James Wilson', 'hvac', '555-456-7890', 'james@phoenixhvacs.com', 'www.phoenixhvacs.com', '321 Service Rd', 'Phoenix', 'AZ', '85004', 10, 95000.00, 'James Wilson', 'Owner'),
('Southwest Legal Associates', 'Jennifer Lee', 'legal', '555-567-8901', 'jennifer@swlegal.com', 'www.swlegalassociates.com', '654 Justice Way', 'Phoenix', 'AZ', '85005', 7, 75000.00, 'Jennifer Lee', 'Managing Partner');

-- Insert a sample email campaign
INSERT INTO email_campaigns (name, description, status, created_by) 
VALUES ('Q2 Local Business Outreach', 'Outreach campaign targeting local service businesses in Phoenix area', 'active', 'LeadFlow AI Marketing');

-- Function to update contact attempts
CREATE OR REPLACE FUNCTION increment_contact_attempts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE target_businesses 
    SET contact_attempts = contact_attempts + 1, 
        last_contact_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update contact attempts
CREATE TRIGGER trg_increment_email_attempts
    AFTER INSERT ON email_outreach
    FOR EACH ROW
    EXECUTE FUNCTION increment_contact_attempts();

CREATE TRIGGER trg_increment_phone_attempts
    AFTER INSERT ON phone_outreach
    FOR EACH ROW
    EXECUTE FUNCTION increment_contact_attempts();

-- Function to update business status based on outreach results
CREATE OR REPLACE FUNCTION update_business_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.replied = TRUE THEN
        UPDATE target_businesses 
        SET status = 'interested', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_status_on_reply
    AFTER UPDATE OF replied ON email_outreach
    FOR EACH ROW
    WHEN (NEW.replied = TRUE)
    EXECUTE FUNCTION update_business_status();
