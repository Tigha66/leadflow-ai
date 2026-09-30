// LeadFlow AI - Conversation Flow Logic

class ConversationFlowManager {
  constructor() {
    this.industryPersonas = {
      dentist: {
        tone: 'professional yet warm',
        keyPhrases: ['comfortable', 'safe', 'painless', 'expert care'],
        commonQuestions: [
          'Are you experiencing pain?',
          'When did you last visit a dentist?',
          'Do you have dental insurance?'
        ],
        bookingFocus: ['appointment convenience', 'pain management', 'insurance coverage']
      },
      medspa: {
        tone: 'caring and consultative',
        keyPhrases: ['relaxing', 'results', 'confidence', 'self-care'],
        commonQuestions: [
          'What service are you interested in?',
          'Have you had this treatment before?',
          'What are your desired results?'
        ],
        bookingFocus: ['availability', 'treatment duration', 'aftercare']
      },
      roofer: {
        tone: 'solution-focused and reliable',
        keyPhrases: ['free estimate', 'quality work', 'fast response', 'warranty'],
        commonQuestions: [
          'What type of roofing issue are you experiencing?',
          'When did you notice the problem?',
          'Have you received other estimates?'
        ],
        bookingFocus: ['inspection timing', 'estimate', 'warranty details']
      },
      hvac: {
        tone: 'knowledgeable and urgent',
        keyPhrases: ['energy efficient', 'comfort guaranteed', 'emergency service'],
        commonQuestions: [
          'What HVAC issue are you facing?',
          'How long has this been happening?',
          'Is this an emergency?'
        ],
        bookingFocus: ['emergency availability', 'cost estimate', 'warranty']
      },
      legal: {
        tone: 'confidential and reassuring',
        keyPhrases: ['confidential', 'experience', 'results', 'free consultation'],
        commonQuestions: [
          'What type of legal issue do you have?',
          'What stage is your case?',
          'What are your main concerns?'
        ],
        bookingFocus: ['consultation', 'case evaluation', 'payment options']
      },
      general: {
        tone: 'friendly and professional',
        keyPhrases: ['happy to help', 'quick response', 'satisfaction guaranteed'],
        commonQuestions: [
          'What service are you looking for?',
          'When do you need this completed?',
          'What is your budget range?'
        ],
        bookingFocus: ['availability', 'pricing', 'timeline']
      }
    };

    this.followUpSequences = {
      no_response: [
        { delay: 5, message: "Hi {{name}}, I hope you're doing well. I wanted to follow up on our previous conversation. Are you still interested in {{service}}?" },
        { delay: 60, message: "Hi {{name}}, just checking in. We'd love to help with your {{service}} needs. Is now a good time to discuss?" },
        { delay: 1440, message: "Hi {{name}}, I know you're busy, but we don't want you to miss out on {{service}}. Would tomorrow work better for a quick chat?" }
      ],
      quote_given: [
        { delay: 4320, message: "Hi {{name}}, I hope our quote for {{service}} was helpful. Do you have any questions or would you like to move forward?" },
        { delay: 10080, message: "Hi {{name}}, just checking if you've had a chance to review our quote for {{service}}. We're flexible with scheduling." },
        { delay: 20160, message: "{{name}}, we're following up on our {{service}} quote. Prices may change soon, so we wanted to give you a final reminder." }
      ],
      missed_call: [
        { delay: 1, message: "Hi {{name}}, sorry we missed your call! How can we help you with {{service}} today?" },
        { delay: 10, message: "{{name}}, we saw your missed call. Can we help with your {{service}} inquiry?" }
      ]
    };
  }

  // Generate AI response based on context
  generateResponse(context) {
    const { message, leadInfo, industry, conversationHistory } = context;
    
    // Determine intent from message
    const intent = this.determineIntent(message, conversationHistory);
    
    // Get appropriate persona based on industry
    const persona = this.industryPersonas[industry] || this.industryPersonas.general;
    
    // Generate response based on intent
    let response;
    switch (intent) {
      case 'greeting':
        response = this.generateGreetingResponse(persona, leadInfo);
        break;
      case 'service_inquiry':
        response = this.generateServiceResponse(persona, leadInfo);
        break;
      case 'booking_inquiry':
        response = this.generateBookingResponse(persona, leadInfo);
        break;
      case 'pricing_inquiry':
        response = this.generatePricingResponse(persona, leadInfo);
        break;
      case 'qualifying':
        response = this.generateQualifyingResponse(persona, leadInfo);
        break;
      case 'follow_up':
        response = this.generateFollowUpResponse(persona, leadInfo);
        break;
      default:
        response = this.generateDefaultResponse(persona, leadInfo);
    }
    
    return response;
  }

  // Determine intent from message and conversation history
  determineIntent(message, conversationHistory = []) {
    const lowerMsg = message.toLowerCase();
    
    // Check for greetings
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      return 'greeting';
    }
    
    // Check for service inquiries
    if (lowerMsg.includes('service') || lowerMsg.includes('need') || lowerMsg.includes('want') || lowerMsg.includes('looking for')) {
      return 'service_inquiry';
    }
    
    // Check for booking related terms
    if (lowerMsg.includes('book') || lowerMsg.includes('schedule') || lowerMsg.includes('appointment') || lowerMsg.includes('time')) {
      return 'booking_inquiry';
    }
    
    // Check for pricing
    if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('how much') || lowerMsg.includes('quote')) {
      return 'pricing_inquiry';
    }
    
    // Check for qualifying information
    if (lowerMsg.includes('when') || lowerMsg.includes('where') || lowerMsg.includes('urgent') || lowerMsg.includes('soon')) {
      return 'qualifying';
    }
    
    // Check for follow-up patterns
    if (lowerMsg.includes('still') || lowerMsg.includes('yet') || lowerMsg.includes('what happened')) {
      return 'follow_up';
    }
    
    // Default to general response
    return 'general';
  }

  // Generate greeting response
  generateGreetingResponse(persona, leadInfo) {
    const greetings = [
      `Hi${leadInfo.name ? ` ${leadInfo.name}` : ''}! Thanks for reaching out. How can I help you today?`,
      `Hello${leadInfo.name ? ` ${leadInfo.name}` : ''}! Great to hear from you. What brings you to us?`,
      `Hi there${leadInfo.name ? `, ${leadInfo.name}` : ''}! I'm here to help with your ${leadInfo.serviceInterest || 'inquiry'}.`
    ];
    
    return this.selectRandom(greetings);
  }

  // Generate service response
  generateServiceResponse(persona, leadInfo) {
    const serviceResponses = [
      `I'd be happy to help with ${leadInfo.serviceInterest || 'that service'}. Could you tell me more about what specifically you need?`,
      `Great choice! ${leadInfo.serviceInterest || 'That service'} is one of our specialties. When were you thinking of getting this done?`,
      `Perfect! ${leadInfo.serviceInterest || 'That service'} is very popular. What's your main goal with this?`
    ];
    
    return this.selectRandom(serviceResponses);
  }

  // Generate booking response
  generateBookingResponse(persona, leadInfo) {
    const bookingResponses = [
      `I can definitely help you book that. We have availability [TIME_OPTIONS]. Which works best for you?`,
      `Sure thing! Let me check our calendar. We can typically accommodate [TIME_OPTIONS]. How does that sound?`,
      `Great! I can schedule that for you. We offer [TIME_OPTIONS] for your convenience.`
    ];
    
    return this.selectRandom(bookingResponses);
  }

  // Generate pricing response
  generatePricingResponse(persona, leadInfo) {
    const pricingResponses = [
      `I'd be happy to provide a quote for ${leadInfo.serviceInterest || 'that service'}. Could you share a bit more about what you're looking for so I can give you the most accurate estimate?`,
      `Our prices vary based on several factors. For ${leadInfo.serviceInterest || 'that service'}, we typically charge [PRICE_RANGE]. Would you like a detailed quote?`,
      `I can provide a free estimate for ${leadInfo.serviceInterest || 'that service'}. Just need a few details about your specific needs.`
    ];
    
    return this.selectRandom(pricingResponses);
  }

  // Generate qualifying response
  generateQualifyingResponse(persona, leadInfo) {
    const qualifyingQuestions = [
      `That's helpful to know. When were you hoping to get this done?`,
      `Got it. What's your timeline for this?`,
      `Understood. Where are you located? We may have special offers for your area.`,
      `Thanks for letting me know. Is this an urgent matter or something you're planning for?`,
      `That's important information. Do you have a budget range in mind for this?`
    ];
    
    return this.selectRandom(qualifyingQuestions);
  }

  // Generate follow-up response
  generateFollowUpResponse(persona, leadInfo) {
    const followUpResponses = [
      `Thanks for following up! I have your information here. How can I help you today?`,
      `No problem at all! I see you're interested in ${leadInfo.serviceInterest || 'our services'}. Let me get you the information you need.`,
      `I appreciate you circling back! Were you able to review the options I sent earlier?`
    ];
    
    return this.selectRandom(followUpResponses);
  }

  // Generate default response
  generateDefaultResponse(persona, leadInfo) {
    const defaultResponses = [
      `I understand. ${this.selectRandom(persona.keyPhrases)} is our priority. What else can I help with?`,
      `Thanks for sharing that. I want to make sure we address all your concerns about ${leadInfo.serviceInterest || 'our services'}.`,
      `I appreciate you reaching out. Let me help you get the information you need about ${leadInfo.serviceInterest || 'this service'}.`
    ];
    
    return this.selectRandom(defaultResponses);
  }

  // Select random response from array
  selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate follow-up sequence based on trigger
  generateFollowUpSequence(trigger, leadInfo) {
    const sequence = this.followUpSequences[trigger];
    if (!sequence) return [];

    return sequence.map(item => ({
      ...item,
      message: this.personalizeMessage(item.message, leadInfo)
    }));
  }

  // Personalize message with lead info
  personalizeMessage(message, leadInfo) {
    return message
      .replace(/\{\{name\}\}/g, leadInfo.name || 'there')
      .replace(/\{\{service\}\}/g, leadInfo.serviceInterest || 'our services')
      .replace(/\{\{phone\}\}/g, leadInfo.phone || 'your number');
  }

  // Get industry-specific qualifying questions
  getQualifyingQuestions(industry) {
    const persona = this.industryPersonas[industry] || this.industryPersonas.general;
    return persona.commonQuestions;
  }

  // Generate booking confirmation
  generateBookingConfirmation(appointmentDetails) {
    const confirmations = [
      `Great! I've booked your appointment for ${appointmentDetails.date} at ${appointmentDetails.time}. Confirmation sent to ${appointmentDetails.contact}. Looking forward to seeing you!`,
      `Perfect! Your appointment is confirmed for ${appointmentDetails.date} at ${appointmentDetails.time}. You'll receive a reminder 24 hours before. Thank you!`,
      `Excellent! Your ${appointmentDetails.service} is scheduled for ${appointmentDetails.date} at ${appointmentDetails.time}. See you then!`
    ];
    
    return this.selectRandom(confirmations);
  }
}

// Export singleton instance
const conversationFlowManager = new ConversationFlowManager();
module.exports = conversationFlowManager;
