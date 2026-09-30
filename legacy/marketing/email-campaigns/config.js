// LeadFlow AI Email Outreach Configuration

module.exports = {
  // Email service configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  },

  // Campaign settings
  campaign: {
    batchSize: parseInt(process.env.CAMPAIGN_BATCH_SIZE) || 5,
    delayBetweenEmails: parseInt(process.env.DELAY_BETWEEN_EMAILS) || 5000, // milliseconds
    maxContactAttempts: parseInt(process.env.MAX_CONTACT_ATTEMPTS) || 3,
    followUpDays: parseInt(process.env.FOLLOW_UP_DAYS) || 3,
    retryInterval: parseInt(process.env.RETRY_INTERVAL) || 7 // days
  },

  // Email templates configuration
  templates: {
    // Weighted selection for different templates
    distribution: {
      hook: 0.25,        // 25% of emails
      painPoint: 0.25,   // 25% of emails
      socialProof: 0.25, // 25% of emails
      curiosity: 0.25    // 25% of emails
    },
    
    // Personalization fields
    personalization: {
      senderName: process.env.EMAIL_SENDER_NAME || 'Alex from LeadFlow AI',
      companyName: 'LeadFlow AI',
      companyDescription: 'Appointment & Lead Follow-Up Agent for local service businesses'
    }
  },

  // Business targeting configuration
  targeting: {
    industries: [
      'dentist', 'medspa', 'roofer', 'hvac', 
      'legal', 'plumber', 'electrician', 'landscaper',
      'cleaning', 'painting', 'carpenter', 'locksmith',
      'pest_control', 'handyman', 'chiropractor', 'physical_therapy'
    ],
    
    businessSize: {
      minEmployees: 2,
      maxEmployees: 20,
      minRevenue: 50000, // annually
      maxRevenue: 500000
    },
    
    geographicRadius: 50 // miles around target cities
  },

  // Tracking and analytics
  tracking: {
    trackOpens: true,
    trackClicks: true,
    trackReplies: true,
    trackConversions: true
  },

  // Compliance settings
  compliance: {
    includeUnsubscribe: true,
    includePhysicalAddress: true,
    followCanSpam: true,
    respectDomainBlacklists: true
  },

  // API Keys for various services
  apiKeys: {
    // These would be loaded from environment variables
    emailValidation: process.env.EMAIL_VALIDATION_API_KEY || null,
    businessData: process.env.BUSINESS_DATA_API_KEY || null,
    geocoding: process.env.GEOCODING_API_KEY || null
  },

  // Database configuration
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/leadflow_ai',
    pool: {
      min: 2,
      max: 10,
      acquire: 30000,
      idle: 10000
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/email-outreach.log',
    maxFileSize: '20m',
    maxFiles: '10'
  },

  // Scheduling configuration
  scheduling: {
    // Run campaign batches at these times (hours in 24-hour format)
    batchTimes: [9, 13, 16], // 9 AM, 1 PM, 4 PM
    
    // Days of week to send emails (0 = Sunday, 6 = Saturday)
    sendDays: [1, 2, 3, 4, 5], // Monday through Friday
    
    // Pause weekends
    pauseWeekends: true
  },

  // Performance thresholds
  performance: {
    maxEmailsPerHour: 100, // To avoid spam filters
    minDelayBetweenBatches: 300000, // 5 minutes between batches
    softBounceThreshold: 0.05, // 5% soft bounce rate triggers warning
    hardBounceThreshold: 0.02 // 2% hard bounce rate triggers action
  },

  // Retry configuration for failed emails
  retries: {
    maxRetries: 2,
    initialDelay: 60000, // 1 minute
    backoffMultiplier: 2, // Exponential backoff
    maxDelay: 3600000 // 1 hour max delay
  },

  // Unsubscribe handling
  unsubscribe: {
    enabled: true,
    pageUrl: process.env.UNSUBSCRIBE_PAGE_URL || 'https://leadflowai.com/unsubscribe',
    autoUpdate: true,
    notifyAdmin: true
  }
};
