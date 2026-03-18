# LeadFlow AI - Appointment & Lead Follow-Up Agent

A production-ready SaaS product that automatically captures, responds to, and converts inbound leads into booked appointments for local service businesses across SMS, WhatsApp, and web chat with minimal human involvement.

## 🎯 Problem Statement
Local service businesses (dentists, med spas, roofers, HVAC companies, legal intake teams, home service providers) lose revenue from missed calls, slow replies, and poor follow-up. LeadFlow AI solves this with instant responses, smart qualification, and automated appointment booking.

## 💡 Solution
LeadFlow AI is an AI-powered assistant that:
- Responds to leads within 10 seconds
- Qualifies leads and moves them toward booking
- Books appointments directly in the chat
- Follows up automatically on no-response or pending leads
- Provides actionable analytics to improve conversion rates

## 🚀 Features

### Lead Capture
- Website chat widget
- SMS integration (via Twilio)
- WhatsApp API integration
- Missed call auto-response

### AI Auto-Responder
- Instant, natural responses in local business tone
- Qualifying questions based on service type
- Intent routing (Booking, Quote, General Question)
- Industry-adaptive personality

### Appointment Booking
- Google Calendar integration
- Real-time availability display
- In-chat booking capability
- Automatic confirmation

### Follow-Up Automation
- Configurable sequences for different scenarios
- Time-based triggers (5min, 1hr, 24hrs, etc.)
- Missed call recovery sequences

### Pipeline Dashboard
- CRM-style pipeline visualization
- Lead status tracking
- Conversion metrics
- Revenue attribution

### Notifications
- Real-time alerts
- Push notifications (PWA)
- SMS notifications

### Human Override
- Business owner can join any conversation
- Toggle AI on/off per conversation
- Edit AI responses before sending

## 🏗️ Technical Architecture

### Frontend
- React with modern UI framework
- Progressive Web App (PWA) for mobile experience
- Real-time chat interface (WhatsApp/SMS style)
- Responsive design for mobile-first experience

### Backend
- Node.js with Express
- PostgreSQL database with optimized schema
- Real-time messaging via WebSockets
- Secure authentication (JWT/OAuth)

### Integrations
- Twilio (SMS + missed call handling)
- WhatsApp Business API
- Google Calendar
- Stripe (payments)

## 📊 Monetization
- **Starter**: $99/month (basic automation + chat)
- **Growth**: $149/month (booking + follow-ups)
- **Pro**: $299-$399/month (advanced automation + analytics)
- Includes free 14-day trial

## 📈 Key Metrics Tracked
- Leads captured
- Response time
- Booking rate
- Revenue influenced
- Missed-call recovery rate

## 🎨 UI/UX Highlights
- Clean, modern SaaS design (Stripe/Linear inspired)
- WhatsApp/SMS-style chat interface
- Conversation bubbles with typing simulation
- Contact list/inbox view
- Status indicators
- Mobile-first responsive design

## 🏁 MVP Scope
✅ Lead comes in via chat or SMS  
✅ AI responds instantly  
✅ User can book appointment  
✅ Follow-up triggers if no reply  
✅ Business owner can view/manage conversation  

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database
- Twilio account (for SMS/WhatsApp)
- Google Calendar API credentials
- Stripe account (for payments)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd leadflow-ai

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/leadflow_ai"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Twilio (for SMS/WhatsApp)
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-number"

# Google Calendar
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALENDAR_ID="primary"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Supabase (for real-time features)
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### Running the Application
```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend (in development)
cd frontend
npm start
```

## 🧩 Database Schema
The database includes tables for users, businesses, leads, appointments, conversations, messages, and analytics. See `schema/database.sql` for complete schema.

## 🤖 AI Behavior
The AI follows industry-adaptive personalities:
- **Dentist**: Professional yet caring, focused on comfort and safety
- **Med Spa**: Caring and consultative, focused on results and confidence
- **Roofer**: Solution-focused and reliable, focused on quality and warranty
- **HVAC**: Knowledgeable and urgent, focused on efficiency and comfort
- **Legal**: Confidential and reassuring, focused on experience and results

## 📱 PWA Features
- Installable on mobile/desktop
- Offline functionality
- Push notifications
- App-like experience

## 📊 Analytics Dashboard
- Lead conversion funnel
- Response time metrics
- Booking success rates
- Revenue attribution
- Missed call recovery statistics

## 🔐 Security
- JWT-based authentication
- Rate limiting
- Input sanitization
- Secure credential storage
- OAuth integration options

## 🔄 Expansion Ideas
- Multi-location businesses
- AI voice agent (call answering)
- Reputation management (review requests)
- Upsell automation
- CRM integrations (HubSpot, GoHighLevel)

## 🎯 Product Philosophy
This is NOT just a chatbot. It is a revenue-generating assistant:
- Every feature ties to making or saving money
- Optimized for conversions, not just conversations
- Simple setup for non-technical users
- Focus on ROI-driven features

---

LeadFlow AI is built to be sold immediately to real local businesses paying $149/month. It focuses on speed, clarity, and revenue-generating features that directly impact the bottom line of local service businesses.
