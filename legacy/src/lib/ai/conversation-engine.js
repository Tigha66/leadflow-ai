/**
 * AI Conversation Engine for LeadFlow AI
 * Handles all AI-powered conversations with leads
 */

const OpenAI = require('openai');

class ConversationEngine {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Industry-specific prompts
    this.industryPrompts = {
      DENTIST: {
        greeting: "Hi! Thanks for reaching out to [BUSINESS_NAME]. I can help you book an appointment. What's your name?",
        services: ["Checkup", "Cleaning", "Tooth Pain", "Whitening", "Other"],
        urgency: ["Same day", "This week", "Next week", "Just browsing"],
        tone: "friendly, professional, caring"
      },
      MED_SPA: {
        greeting: "Welcome to [BUSINESS_NAME]! I'd love to help you look and feel your best. What's your name?",
        services: ["Botox", "Fillers", "Laser", "Skin Care", "Body Contouring", "Other"],
        urgency: ["ASAP", "This week", "This month", "Just researching"],
        tone: "warm, upscale, consultative"
      },
      ROOFER: {
        greeting: "Thanks for contacting [BUSINESS_NAME]. We can help with your roof. What's your name?",
        services: ["Repair", "Replacement", "Inspection", "Emergency", "Quote"],
        urgency: ["Emergency", "This week", "This month", "Planning ahead"],
        tone: "direct, trustworthy, efficient"
      },
      HVAC: {
        greeting: "Hi! [BUSINESS_NAME] here. I can help with your heating/cooling needs. What's your name?",
        services: ["AC Repair", "Heating Repair", "Maintenance", "Installation", "Emergency"],
        urgency: ["Emergency", "This week", "This month", "Routine"],
        tone: "helpful, knowledgeable, reassuring"
      },
      LEGAL: {
        greeting: "Thank you for contacting [BUSINESS_NAME]. How can we help with your legal matter? What's your name?",
        services: ["Personal Injury", "Family Law", "Criminal Defense", "Business Law", "Other"],
        urgency: ["Urgent", "This week", "This month", "Consultation"],
        tone: "professional, empathetic, discreet"
      },
      HOME_SERVICE: {
        greeting: "Hi! Thanks for reaching out to [BUSINESS_NAME]. I can help schedule your service. What's your name?",
        services: ["Plumbing", "Electrical", "Cleaning", "Landscaping", "Other"],
        urgency: ["Emergency", "This week", "This month", "Flexible"],
        tone: "friendly, reliable, efficient"
      }
    };

    // Conversation state machine
    this.states = {
      GREETING: 'greeting',
      GET_NAME: 'get_name',
      GET_SERVICE: 'get_service',
      GET_URGENCY: 'get_urgency',
      GET_DETAILS: 'get_details',
      GET_CONTACT: 'get_contact',
      BOOK_APPOINTMENT: 'book_appointment',
      CONFIRM: 'confirm',
      CLOSE: 'close'
    };
  }

  /**
   * Process incoming message and generate AI response
   * @param {Object} params - Conversation parameters
   * @returns {Object} AI response
   */
  async processMessage({ 
    message, 
    conversationHistory, 
    business, 
    lead, 
    currentState 
  }) {
    try {
      // Get industry-specific prompt
      const industryPrompt = this.industryPrompts[business.type] || this.industryPrompts.OTHER;

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(business, industryPrompt, currentState);

      // Build conversation context
      const context = this.buildContext(conversationHistory, lead, business);

      // Call OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
        ],
        temperature: 0.7,
        max_tokens: 150,
        presence_penalty: 0.2,
        frequency_penalty: 0.2
      });

      // Parse response
      const aiMessage = response.choices[0].message.content;
      const nextState = this.determineNextState(aiMessage, currentState);

      // Extract structured data if any
      const extractedData = this.extractData(aiMessage, lead);

      return {
        message: aiMessage,
        nextState,
        extractedData,
        metadata: {
          model: 'gpt-4',
          tokens: response.usage.total_tokens,
          latency: response._responseMs
        }
      };

    } catch (error) {
      console.error('AI conversation error:', error);
      
      // Fallback response
      return {
        message: "Thanks for your message! A team member will get back to you shortly.",
        nextState: this.states.CLOSE,
        extractedData: {},
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Build system prompt for AI
   */
  buildSystemPrompt(business, industryPrompt, currentState) {
    return `You are LeadFlow AI, a friendly appointment booking assistant for ${business.name}, a ${business.type} business.

YOUR GOALS (in priority order):
1. Get the lead's name (if you don't have it)
2. Understand what service they need
3. Determine urgency/timeline
4. Get contact info (phone/email)
5. Book an appointment

CONVERSATION FLOW:
${currentState === this.states.GREETING ? `- Start with: "${industryPrompt.greeting.replace('[BUSINESS_NAME]', business.name)}"` : ''}
${currentState === this.states.GET_SERVICE ? `- Ask what service they need. Options: ${industryPrompt.services.join(', ')}` : ''}
${currentState === this.states.GET_URGENCY ? `- Ask about timeline. Options: ${industryPrompt.urgency.join(', ')}` : ''}
${currentState === this.states.GET_CONTACT ? `- Ask for phone number or email to confirm appointment` : ''}
${currentState === this.states.BOOK_APPOINTMENT ? `- Offer available time slots and ask them to choose` : ''}
${currentState === this.states.CONFIRM ? `- Confirm appointment details and ask for confirmation` : ''}

TONE GUIDELINES:
- ${industryPrompt.tone}
- Keep messages under 2 sentences
- Ask ONE question at a time
- Use emojis sparingly (max 1 per message)
- Be friendly but efficient
- Always include a clear call-to-action

RESPONSE RULES:
- If they mention pain/emergency → Show empathy + offer ASAP appointment
- If they ask about price → "I'd need to understand your needs first. Let me get some details, then we can discuss pricing."
- If they want to talk to human → "Of course! Let me get your contact info and someone will call you."
- If they're just browsing → Still get contact info for follow-up

CURRENT STATE: ${currentState}
BUSINESS: ${business.name} (${business.type})
WORKING HOURS: ${business.workingHours ? JSON.stringify(business.workingHours) : '9am-5pm Mon-Fri'}
`;
  }

  /**
   * Build conversation context from history
   */
  buildContext(history, lead, business) {
    const context = [];

    // Add lead info if available
    if (lead) {
      context.push(`Lead info we have:
- Name: ${lead.name || 'Unknown'}
- Phone: ${lead.phone || 'Unknown'}
- Email: ${lead.email || 'Unknown'}
- Service interest: ${lead.service || 'Unknown'}
- Status: ${lead.status}
`);
    }

    // Add conversation history (last 10 messages)
    const recentHistory = history.slice(-10).map(msg => {
      const speaker = msg.direction === 'INBOUND' ? 'Lead' : 'AI';
      return `${speaker}: ${msg.content}`;
    }).join('\n');

    context.push(`\nRecent conversation:\n${recentHistory}`);

    // Add current message
    context.push(`\nLead's latest message: "${history[history.length - 1]?.content}"`);

    return context.join('\n');
  }

  /**
   * Determine next conversation state
   */
  determineNextState(aiMessage, currentState) {
    const message = aiMessage.toLowerCase();

    // State transitions
    if (currentState === this.states.GREETING) {
      return this.states.GET_SERVICE;
    }

    if (currentState === this.states.GET_SERVICE) {
      return this.states.GET_URGENCY;
    }

    if (currentState === this.states.GET_URGENCY) {
      return this.states.GET_CONTACT;
    }

    if (currentState === this.states.GET_CONTACT) {
      return this.states.BOOK_APPOINTMENT;
    }

    if (currentState === this.states.BOOK_APPOINTMENT) {
      return this.states.CONFIRM;
    }

    if (currentState === this.states.CONFIRM) {
      return this.states.CLOSE;
    }

    return currentState;
  }

  /**
   * Extract structured data from AI message
   */
  extractData(aiMessage, existingLead) {
    const extracted = {};

    // Extract name
    const nameMatch = aiMessage.match(/(?:my name is|i'm|i am)\s+([A-Z][a-z]+\s*[A-Z]?[a-z]*)/i);
    if (nameMatch && !existingLead?.name) {
      extracted.name = nameMatch[1].trim();
    }

    // Extract phone
    const phoneMatch = aiMessage.match(/(\+?[\d\s-]{10,})/);
    if (phoneMatch && !existingLead?.phone) {
      extracted.phone = phoneMatch[1].trim();
    }

    // Extract email
    const emailMatch = aiMessage.match(/([\w.-]+@[\w.-]+\.\w+)/i);
    if (emailMatch && !existingLead?.email) {
      extracted.email = emailMatch[1].trim();
    }

    // Extract service
    const services = ['checkup', 'cleaning', 'repair', 'replacement', 'installation', 'emergency', 'consultation', 'quote'];
    const serviceMatch = services.find(s => aiMessage.toLowerCase().includes(s));
    if (serviceMatch && !existingLead?.service) {
      extracted.service = serviceMatch;
    }

    return extracted;
  }

  /**
   * Generate follow-up message based on trigger
   */
  async generateFollowUp({ trigger, lead, business, hoursSinceLastContact }) {
    const prompts = {
      NO_RESPONSE: `Hi ${lead.name || 'there'}! Just following up on your inquiry about ${lead.service || 'our services'}. Do you have any questions?`,
      QUOTE_SENT: `Hi ${lead.name || 'there'}! Just checking if you had a chance to review the quote we sent. Any questions?`,
      APPOINTMENT_REMINDER: `Hi ${lead.name || 'there'}! This is a friendly reminder about your appointment ${hoursSinceLastContact < 24 ? 'tomorrow' : 'today'}. Reply CONFIRM to confirm or RESCHEDULE to change.`,
      MISSED_CALL: `Hi! Sorry we missed your call. How can we help? Reply here or call us back at ${business.phone}.`,
      POST_APPOINTMENT: `Hi ${lead.name || 'there'}! Hope everything went well with your appointment. Would you mind leaving us a quick review?`
    };

    return {
      message: prompts[trigger] || prompts.NO_RESPONSE,
      channel: 'SMS',
      delay: this.calculateDelay(trigger, hoursSinceLastContact)
    };
  }

  /**
   * Calculate optimal follow-up delay
   */
  calculateDelay(trigger, hoursSinceLastContact) {
    const delays = {
      NO_RESPONSE: hoursSinceLastContact < 1 ? 300 : hoursSinceLastContact < 6 ? 3600 : 86400, // 5min, 1hr, 24hr
      QUOTE_SENT: 86400 * 2, // 2 days
      APPOINTMENT_REMINDER: 86400, // 1 day before
      MISSED_CALL: 60, // 1 minute
      POST_APPOINTMENT: 86400 * 2 // 2 days after
    };

    return delays[trigger] || 3600;
  }

  /**
   * Score lead based on conversation
   */
  scoreLead({ conversation, lead, business }) {
    let score = 50; // Base score

    // Increase score for positive signals
    if (lead.name) score += 10;
    if (lead.phone) score += 15;
    if (lead.email) score += 10;
    if (lead.service) score += 10;
    
    // Increase for urgency
    const urgentKeywords = ['emergency', 'urgent', 'asap', 'pain', 'broken', 'leak'];
    const hasUrgency = conversation.some(msg => 
      urgentKeywords.some(k => msg.content.toLowerCase().includes(k))
    );
    if (hasUrgency) score += 20;

    // Increase for engagement
    if (conversation.length > 5) score += 10;
    if (conversation.length > 10) score += 10;

    // Decrease for negative signals
    const negativeKeywords = ['just looking', 'just browsing', 'not sure', 'maybe later'];
    const hasNegative = conversation.some(msg => 
      negativeKeywords.some(k => msg.content.toLowerCase().includes(k))
    );
    if (hasNegative) score -= 20;

    // Cap at 0-100
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = ConversationEngine;
