// Sample Demo Data for LeadFlow AI

const sampleData = {
  users: [
    {
      id: 'user_1',
      email: 'dr.johnson@dentalpractice.com',
      business_name: 'Johnson Dental Practice',
      business_type: 'dentist',
      phone: '+15551234567',
      subscription_tier: 'growth',
      subscription_status: 'active',
      created_at: '2023-01-15T10:30:00Z'
    },
    {
      id: 'user_2',
      email: 'sarah@medspasalon.com',
      business_name: 'Elite Med Spa',
      business_type: 'medspa',
      phone: '+15559876543',
      subscription_tier: 'pro',
      subscription_status: 'active',
      created_at: '2023-02-20T14:15:00Z'
    },
    {
      id: 'user_3',
      email: 'mike@roofingco.com',
      business_name: 'Quality Roofing Co.',
      business_type: 'roofer',
      phone: '+15554567890',
      subscription_tier: 'growth',
      subscription_status: 'active',
      created_at: '2023-03-10T09:45:00Z'
    }
  ],

  businesses: [
    {
      id: 'biz_1',
      user_id: 'user_1',
      name: 'Johnson Dental Practice',
      address: '123 Main St, Anytown, USA',
      phone: '+15551234567',
      operating_hours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '09:00', close: '15:00' },
        sunday: { open: null, close: null }
      },
      timezone: 'America/New_York',
      created_at: '2023-01-15T10:30:00Z'
    },
    {
      id: 'biz_2',
      user_id: 'user_2',
      name: 'Elite Med Spa',
      address: '456 Beauty Blvd, Cosmotown, USA',
      phone: '+15559876543',
      operating_hours: {
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '19:00' },
        thursday: { open: '09:00', close: '21:00' },
        friday: { open: '09:00', close: '19:00' },
        saturday: { open: '08:00', close: '16:00' },
        sunday: { open: '10:00', close: '16:00' }
      },
      timezone: 'America/New_York',
      created_at: '2023-02-20T14:15:00Z'
    },
    {
      id: 'biz_3',
      user_id: 'user_3',
      name: 'Quality Roofing Co.',
      address: '789 Construction Ave, Rooftown, USA',
      phone: '+15554567890',
      operating_hours: {
        monday: { open: '07:00', close: '17:00' },
        tuesday: { open: '07:00', close: '17:00' },
        wednesday: { open: '07:00', close: '17:00' },
        thursday: { open: '07:00', close: '17:00' },
        friday: { open: '07:00', close: '17:00' },
        saturday: { open: '08:00', close: '12:00' },
        sunday: { open: null, close: null }
      },
      timezone: 'America/New_York',
      created_at: '2023-03-10T09:45:00Z'
    }
  ],

  services: [
    {
      id: 'serv_1',
      business_id: 'biz_1',
      name: 'Dental Cleaning',
      description: 'Professional teeth cleaning and examination',
      duration_minutes: 60,
      price: 150.00,
      created_at: '2023-01-15T10:30:00Z'
    },
    {
      id: 'serv_2',
      business_id: 'biz_1',
      name: 'Root Canal',
      description: 'Endodontic treatment for infected tooth',
      duration_minutes: 120,
      price: 1200.00,
      created_at: '2023-01-15T10:30:00Z'
    },
    {
      id: 'serv_3',
      business_id: 'biz_2',
      name: 'Botox Treatment',
      description: 'Cosmetic wrinkle reduction injection',
      duration_minutes: 30,
      price: 400.00,
      created_at: '2023-02-20T14:15:00Z'
    },
    {
      id: 'serv_4',
      business_id: 'biz_2',
      name: 'Facial',
      description: 'Deep cleansing and rejuvenating facial treatment',
      duration_minutes: 60,
      price: 120.00,
      created_at: '2023-02-20T14:15:00Z'
    },
    {
      id: 'serv_5',
      business_id: 'biz_3',
      name: 'Roof Inspection',
      description: 'Professional roof assessment and report',
      duration_minutes: 90,
      price: 150.00,
      created_at: '2023-03-10T09:45:00Z'
    },
    {
      id: 'serv_6',
      business_id: 'biz_3',
      name: 'Shingle Replacement',
      description: 'Repair or replacement of damaged shingles',
      duration_minutes: 240,
      price: 800.00,
      created_at: '2023-03-10T09:45:00Z'
    }
  ],

  leads: [
    {
      id: 'lead_1',
      business_id: 'biz_1',
      name: 'John Smith',
      phone: '+15551112222',
      email: 'john.smith@email.com',
      service_interest: 'Dental Cleaning',
      source: 'web',
      status: 'new',
      lead_value: 150.00,
      conversation_history: [
        {
          timestamp: '2023-06-15T10:00:00Z',
          sender: 'lead',
          message: 'Hi, I\'m interested in getting a dental cleaning.'
        },
        {
          timestamp: '2023-06-15T10:02:00Z',
          sender: 'ai',
          message: 'Hi John! Great to hear from you. How soon would you like to schedule?'
        }
      ],
      last_contacted_at: '2023-06-15T10:02:00Z',
      created_at: '2023-06-15T10:00:00Z'
    },
    {
      id: 'lead_2',
      business_id: 'biz_1',
      name: 'Sarah Johnson',
      phone: '+15553334444',
      email: 'sarah.j@email.com',
      service_interest: 'Root Canal',
      source: 'sms',
      status: 'contacted',
      lead_value: 1200.00,
      conversation_history: [
        {
          timestamp: '2023-06-15T09:15:00Z',
          sender: 'lead',
          message: 'I need to schedule a root canal asap. My tooth is killing me.'
        },
        {
          timestamp: '2023-06-15T09:17:00Z',
          sender: 'ai',
          message: 'I\'m sorry to hear about your pain, Sarah. We can typically see emergency cases same day. What time works for you?'
        }
      ],
      last_contacted_at: '2023-06-15T09:17:00Z',
      created_at: '2023-06-15T09:15:00Z'
    },
    {
      id: 'lead_3',
      business_id: 'biz_2',
      name: 'Mike Davis',
      phone: '+15555556666',
      email: 'mike.davis@email.com',
      service_interest: 'Botox Treatment',
      source: 'web',
      status: 'qualified',
      lead_value: 400.00,
      conversation_history: [
        {
          timestamp: '2023-06-15T08:45:00Z',
          sender: 'lead',
          message: 'I\'m interested in botox. How much does it cost and how long does it last?'
        },
        {
          timestamp: '2023-06-15T08:47:00Z',
          sender: 'ai',
          message: 'Hi Mike! Botox typically costs $400 per area and lasts 3-4 months. Would you like to schedule a consultation?'
        },
        {
          timestamp: '2023-06-15T08:50:00Z',
          sender: 'lead',
          message: 'Yes, I\'d like to schedule a consultation. I prefer morning appointments.'
        }
      ],
      last_contacted_at: '2023-06-15T08:50:00Z',
      created_at: '2023-06-15T08:45:00Z'
    },
    {
      id: 'lead_4',
      business_id: 'biz_3',
      name: 'Emily Wilson',
      phone: '+15557778888',
      email: 'emily.wilson@email.com',
      service_interest: 'Roof Inspection',
      source: 'missed_call',
      status: 'new',
      lead_value: 150.00,
      conversation_history: [
        {
          timestamp: '2023-06-15T07:20:00Z',
          sender: 'ai',
          message: 'Hi Emily, sorry we missed your call! How can we help with your roofing needs today?'
        },
        {
          timestamp: '2023-06-15T07:25:00Z',
          sender: 'lead',
          message: 'Hi, I noticed some water stains on my ceiling and think I need a roof inspection.'
        }
      ],
      last_contacted_at: '2023-06-15T07:25:00Z',
      created_at: '2023-06-15T07:20:00Z'
    }
  ],

  appointments: [
    {
      id: 'apt_1',
      lead_id: 'lead_1',
      service_id: 'serv_1',
      scheduled_at: '2023-06-20T10:00:00Z',
      duration_minutes: 60,
      status: 'scheduled',
      confirmation_sent: true,
      created_at: '2023-06-15T10:30:00Z'
    },
    {
      id: 'apt_2',
      lead_id: 'lead_2',
      service_id: 'serv_2',
      scheduled_at: '2023-06-15T14:00:00Z',
      duration_minutes: 120,
      status: 'completed',
      confirmation_sent: true,
      created_at: '2023-06-15T09:30:00Z'
    },
    {
      id: 'apt_3',
      lead_id: 'lead_3',
      service_id: 'serv_3',
      scheduled_at: '2023-06-18T11:00:00Z',
      duration_minutes: 30,
      status: 'scheduled',
      confirmation_sent: true,
      created_at: '2023-06-15T09:00:00Z'
    }
  ],

  conversations: [
    {
      id: 'conv_1',
      lead_id: 'lead_1',
      started_at: '2023-06-15T10:00:00Z',
      ended_at: null,
      status: 'active',
      ai_enabled: true,
      created_at: '2023-06-15T10:00:00Z'
    },
    {
      id: 'conv_2',
      lead_id: 'lead_2',
      started_at: '2023-06-15T09:15:00Z',
      ended_at: '2023-06-15T09:45:00Z',
      status: 'resolved',
      ai_enabled: true,
      created_at: '2023-06-15T09:15:00Z'
    }
  ],

  messages: [
    {
      id: 'msg_1',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      sender_id: 'lead_1',
      content: 'Hi, I\'m interested in getting a dental cleaning.',
      message_type: 'text',
      delivered: true,
      read: true,
      created_at: '2023-06-15T10:00:00Z'
    },
    {
      id: 'msg_2',
      conversation_id: 'conv_1',
      sender_type: 'ai',
      sender_id: null,
      content: 'Hi John! Great to hear from you. How soon would you like to schedule?',
      message_type: 'text',
      delivered: true,
      read: true,
      created_at: '2023-06-15T10:02:00Z'
    },
    {
      id: 'msg_3',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      sender_id: 'lead_1',
      content: 'Probably within the next 2 weeks.',
      message_type: 'text',
      delivered: true,
      read: true,
      created_at: '2023-06-15T10:05:00Z'
    },
    {
      id: 'msg_4',
      conversation_id: 'conv_1',
      sender_type: 'ai',
      sender_id: null,
      content: 'Perfect! We have availability next Tuesday at 10 AM or Thursday at 2 PM. Which works better for you?',
      message_type: 'text',
      delivered: true,
      read: true,
      created_at: '2023-06-15T10:07:00Z'
    },
    {
      id: 'msg_5',
      conversation_id: 'conv_2',
      sender_type: 'lead',
      sender_id: 'lead_2',
      content: 'I need to schedule a root canal asap. My tooth is killing me.',
      message_type: 'text',
      delivered: true,
      read: true,
      created_at: '2023-06-15T09:15:00Z'
    },
    {
      id: 'msg_6',
      conversation_id: 'conv_2',
      sender_type: 'ai',
      sender_id: null,
      content: 'I\'m sorry to hear about your pain, Sarah. We can typically see emergency cases same day. What time works for you?',
      message_type: 'text',
      delivered: true,
      read: true,
      created_at: '2023-06-15T09:17:00Z'
    }
  ],

  follow_up_sequences: [
    {
      id: 'seq_1',
      business_id: 'biz_1',
      name: 'No Response Follow-up',
      trigger_event: 'no_response',
      delay_minutes: 5,
      message_template: 'Hi {{name}}, I hope you\'re doing well. I wanted to follow up on our previous conversation about {{service}}. Are you still interested?',
      is_active: true,
      created_at: '2023-01-15T10:30:00Z'
    },
    {
      id: 'seq_2',
      business_id: 'biz_1',
      name: 'Quote Given Follow-up',
      trigger_event: 'quote_given',
      delay_minutes: 4320, // 3 days
      message_template: 'Hi {{name}}, I hope our quote for {{service}} was helpful. Do you have any questions or would you like to move forward?',
      is_active: true,
      created_at: '2023-01-15T10:30:00Z'
    }
  ],

  business_settings: [
    {
      id: 'settings_1',
      business_id: 'biz_1',
      auto_reply_enabled: true,
      follow_up_enabled: true,
      working_hours_start: '08:00',
      working_hours_end: '18:00',
      timezone: 'America/New_York',
      ai_personality: 'friendly_professional',
      custom_responses: {
        'after_hours': 'We are currently closed. Our AI assistant will respond during business hours.',
        'emergency': 'For dental emergencies, please call our emergency line at +1-555-EMERGENCY.'
      },
      created_at: '2023-01-15T10:30:00Z',
      updated_at: '2023-01-15T10:30:00Z'
    }
  ],

  usage_analytics: [
    {
      id: 'analytic_1',
      business_id: 'biz_1',
      metric_type: 'leads_captured',
      value: 42,
      date: '2023-06-15',
      created_at: '2023-06-15T23:59:59Z'
    },
    {
      id: 'analytic_2',
      business_id: 'biz_1',
      metric_type: 'booking_rate',
      value: 42.9,
      date: '2023-06-15',
      created_at: '2023-06-15T23:59:59Z'
    },
    {
      id: 'analytic_3',
      business_id: 'biz_1',
      metric_type: 'response_time_seconds',
      value: 8.5,
      date: '2023-06-15',
      created_at: '2023-06-15T23:59:59Z'
    }
  ]
};

module.exports = sampleData;
