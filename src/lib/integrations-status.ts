import "server-only";

/** Which platform-level integrations have credentials. Values are never exposed — only booleans. */
export function integrationStatus() {
  return {
    database: Boolean(process.env.DATABASE_URL),
    twilio: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    twilioNumber: Boolean(process.env.TWILIO_PHONE_NUMBER),
    openai: Boolean(process.env.OPENAI_API_KEY),
    realtimeRelay: Boolean(process.env.REALTIME_RELAY_URL && process.env.RELAY_SHARED_SECRET),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    stripePrices: Boolean(process.env.STRIPE_PRICE_STARTER && process.env.STRIPE_PRICE_GROWTH && process.env.STRIPE_PRICE_PRO),
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    authSecret: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32),
  };
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}
