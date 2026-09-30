// Stripe Integration Stub for LeadFlow AI

class StripeStub {
  constructor() {
    this.enabled = false;
    this.credentials = null;
    this.customers = new Map();
    this.subscriptions = new Map();
    this.products = new Map();
    this.prices = new Map();
    this.paymentIntents = new Map();
    
    // Initialize with default products and prices for LeadFlow AI
    this.initializeDefaults();
  }

  initializeDefaults() {
    // Create default products and prices for LeadFlow AI tiers
    const products = [
      {
        id: 'prod_starter',
        name: 'Starter Plan',
        description: 'Basic automation + chat',
        active: true
      },
      {
        id: 'prod_growth',
        name: 'Growth Plan',
        description: 'Booking + follow-ups',
        active: true
      },
      {
        id: 'prod_pro',
        name: 'Pro Plan',
        description: 'Advanced automation + analytics',
        active: true
      }
    ];

    const prices = [
      {
        id: 'price_starter',
        productId: 'prod_starter',
        unitAmount: 9900, // $99 in cents
        currency: 'usd',
        recurring: { interval: 'month' },
        active: true
      },
      {
        id: 'price_growth',
        productId: 'prod_growth',
        unitAmount: 14900, // $149 in cents
        currency: 'usd',
        recurring: { interval: 'month' },
        active: true
      },
      {
        id: 'price_pro',
        productId: 'prod_pro',
        unitAmount: 39900, // $399 in cents
        currency: 'usd',
        recurring: { interval: 'month' },
        active: true
      }
    ];

    // Store defaults
    products.forEach(product => this.products.set(product.id, product));
    prices.forEach(price => this.prices.set(price.id, price));
  }

  async initialize(credentials) {
    try {
      // In real implementation, this would be the Stripe client
      // const stripe = require('stripe')(credentials.secretKey);
      // this.stripe = stripe;
      
      this.credentials = credentials;
      this.enabled = true;
      console.log('Stripe stub initialized');
      return { success: true, message: 'Stripe integration ready' };
    } catch (error) {
      console.error('Stripe initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  async createCustomer(customerData) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // const customer = await this.stripe.customers.create({
    //   email: customerData.email,
    //   name: customerData.name,
    //   phone: customerData.phone,
    //   metadata: customerData.metadata || {}
    // });

    const customerId = `cus_${Date.now()}`;
    const customer = {
      id: customerId,
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      metadata: customerData.metadata || {},
      created: new Date().toISOString(),
      balance: 0,
      currency: 'usd',
      default_source: null,
      delinquent: false,
      discount: null,
      livemode: false,
      shipping: null,
      tax_exempt: 'none',
      tax_ids: null
    };

    this.customers.set(customerId, customer);

    return customer;
  }

  async getCustomer(customerId) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.customers.retrieve(customerId);

    return this.customers.get(customerId) || null;
  }

  async updateCustomer(customerId, updateData) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.customers.update(customerId, updateData);

    let customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    customer = { ...customer, ...updateData, updated: new Date().toISOString() };
    this.customers.set(customerId, customer);

    return customer;
  }

  async createSubscription(customerId, priceId, trialDays = 14) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // Verify customer and price exist
    const customer = this.customers.get(customerId);
    const price = this.prices.get(priceId);
    
    if (!customer) throw new Error('Customer not found');
    if (!price) throw new Error('Price not found');

    // In real implementation:
    // const subscription = await this.stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [{ price: priceId }],
    //   trial_period_days: trialDays,
    //   payment_behavior: 'default_incomplete',
    //   expand: ['latest_invoice.payment_intent']
    // });

    const subscriptionId = `sub_${Date.now()}`;
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const subscription = {
      id: subscriptionId,
      object: 'subscription',
      customer: customerId,
      status: 'trialing', // Start with trial
      metadata: {},
      items: {
        object: 'list',
        data: [{
          id: `si_${Date.now()}`,
          object: 'subscription_item',
          price: price,
          quantity: 1
        }]
      },
      current_period_start: Math.floor(currentPeriodStart.getTime() / 1000),
      current_period_end: Math.floor(currentPeriodEnd.getTime() / 1000),
      trial_start: Math.floor(new Date().getTime() / 1000),
      trial_end: Math.floor(new Date(new Date().getTime() + trialDays * 24 * 60 * 60 * 1000).getTime() / 1000),
      cancel_at_period_end: false,
      canceled_at: null,
      created: Math.floor(new Date().getTime() / 1000),
      discount: null,
      ended_at: null,
      livemode: false,
      pause_collection: null,
      payment_settings: {
        payment_method_options: null,
        payment_method_types: null,
        save_default_payment_method: 'off'
      },
      pending_update: null,
      billing_cycle_anchor: Math.floor(currentPeriodEnd.getTime() / 1000),
      billing_thresholds: null,
      cancel_at: null,
      collection_method: 'charge_automatically',
      days_until_due: null,
      default_payment_method: null,
      default_source: null,
      next_pending_invoice_item_invoice: null,
      pause_collection: null,
      pending_invoice_item_interval: null,
      pending_setup_intent: null,
      pending_update: null,
      schedule: null,
      transfer_data: null,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'create_invoice'
        }
      }
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Update customer with subscription info
    customer.subscriptionId = subscriptionId;
    customer.subscriptionStatus = 'trialing';
    customer.subscriptionTier = this.getTierFromPriceId(priceId);
    this.customers.set(customerId, customer);

    return subscription;
  }

  async getSubscription(subscriptionId) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.subscriptions.retrieve(subscriptionId);

    return this.subscriptions.get(subscriptionId) || null;
  }

  async updateSubscription(subscriptionId, updateData) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.subscriptions.update(subscriptionId, updateData);

    let subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Handle price changes
    if (updateData.items) {
      updateData.items.forEach(item => {
        if (item.price) {
          const newPrice = this.prices.get(item.price);
          if (newPrice) {
            // Update the subscription item
            if (subscription.items.data && subscription.items.data[0]) {
              subscription.items.data[0].price = newPrice;
            }
          }
        }
      });
    }

    subscription = { ...subscription, ...updateData, updated: new Date().toISOString() };
    this.subscriptions.set(subscriptionId, subscription);

    return subscription;
  }

  async cancelSubscription(subscriptionId, atPeriodEnd = true) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.subscriptions.update(subscriptionId, {
    //   cancel_at_period_end: atPeriodEnd
    // });

    let subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.cancel_at_period_end = atPeriodEnd;
    subscription.status = atPeriodEnd ? 'active' : 'canceled';
    subscription.canceled_at = atPeriodEnd ? null : Math.floor(new Date().getTime() / 1000);
    
    this.subscriptions.set(subscriptionId, subscription);

    // Update associated customer
    const customer = Array.from(this.customers.values()).find(c => c.subscriptionId === subscriptionId);
    if (customer) {
      customer.subscriptionStatus = atPeriodEnd ? 'cancelling' : 'cancelled';
      this.customers.set(customer.id, customer);
    }

    return subscription;
  }

  async createPaymentIntent(amount, currency = 'usd', customer = null, receiptEmail = null) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // const paymentIntent = await this.stripe.paymentIntents.create({
    //   amount,
    //   currency,
    //   customer,
    //   receipt_email: receiptEmail,
    //   automatic_payment_methods: { enabled: true }
    // });

    const paymentIntentId = `pi_${Date.now()}`;
    const paymentIntent = {
      id: paymentIntentId,
      object: 'payment_intent',
      amount,
      currency,
      customer,
      receipt_email: receiptEmail,
      status: 'requires_payment_method',
      created: Math.floor(new Date().getTime() / 1000),
      description: 'LeadFlow AI Payment',
      last_payment_error: null,
      livemode: false,
      next_action: null,
      payment_method: null,
      payment_method_options: null,
      payment_method_types: ['card'],
      setup_future_usage: null,
      shipping: null,
      statement_descriptor: 'LEADFLOW AI',
      statement_descriptor_suffix: null,
      transfer_data: null,
      transfer_group: null
    };

    this.paymentIntents.set(paymentIntentId, paymentIntent);

    return paymentIntent;
  }

  async retrievePaymentIntent(paymentIntentId) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.paymentIntents.retrieve(paymentIntentId);

    return this.paymentIntents.get(paymentIntentId) || null;
  }

  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.paymentIntents.confirm(paymentIntentId, {
    //   payment_method: paymentMethodId
    // });

    let paymentIntent = this.paymentIntents.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    paymentIntent.status = 'processing';
    paymentIntent.payment_method = paymentMethodId;
    this.paymentIntents.set(paymentIntentId, paymentIntent);

    // Simulate successful payment after a delay
    setTimeout(() => {
      paymentIntent = this.paymentIntents.get(paymentIntentId);
      if (paymentIntent) {
        paymentIntent.status = 'succeeded';
        this.paymentIntents.set(paymentIntentId, paymentIntent);
      }
    }, 1000);

    return paymentIntent;
  }

  async listProducts(active = true) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.products.list({ active });

    const products = Array.from(this.products.values());
    return {
      object: 'list',
      data: active ? products.filter(p => p.active) : products,
      has_more: false,
      url: '/v1/products'
    };
  }

  async listPrices(productId = null, active = true) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // const params = { active };
    // if (productId) params.product = productId;
    // return await this.stripe.prices.list(params);

    let prices = Array.from(this.prices.values());
    if (productId) {
      prices = prices.filter(p => p.productId === productId);
    }
    if (active) {
      prices = prices.filter(p => p.active);
    }

    return {
      object: 'list',
      data: prices,
      has_more: false,
      url: '/v1/prices'
    };
  }

  async createSetupIntent(customerId) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.setupIntents.create({
    //   customer: customerId,
    //   payment_method_types: ['card']
    // });

    const setupIntentId = `seti_${Date.now()}`;
    const setupIntent = {
      id: setupIntentId,
      object: 'setup_intent',
      customer: customerId,
      status: 'requires_payment_method',
      created: Math.floor(new Date().getTime() / 1000),
      description: 'LeadFlow AI Setup',
      latest_attempt: null,
      last_setup_error: null,
      livemode: false,
      next_action: null,
      payment_method: null,
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      payment_method_types: ['card'],
      single_use_mandate: null,
      usage: 'off_session'
    };

    return setupIntent;
  }

  async createInvoiceItem(customerId, priceId, quantity = 1) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.invoiceItems.create({
    //   customer: customerId,
    //   price: priceId,
    //   quantity
    // });

    return {
      id: `ii_${Date.now()}`,
      object: 'invoiceitem',
      amount: this.prices.get(priceId)?.unitAmount * quantity || 0,
      currency: 'usd',
      customer: customerId,
      date: Math.floor(new Date().getTime() / 1000),
      description: this.products.get(this.prices.get(priceId)?.productId)?.name || 'Service',
      discountable: true,
      livemode: false,
      period: {
        start: Math.floor(new Date().getTime() / 1000),
        end: Math.floor(new Date().getTime() / 1000)
      },
      price: this.prices.get(priceId),
      quantity,
      subscription: null,
      tax_rates: []
    };
  }

  async createInvoice(customerId) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.invoices.create({
    //   customer: customerId
    // });

    return {
      id: `in_${Date.now()}`,
      object: 'invoice',
      amount_due: 0,
      amount_paid: 0,
      amount_remaining: 0,
      currency: 'usd',
      customer: customerId,
      status: 'draft',
      created: Math.floor(new Date().getTime() / 1000),
      description: 'LeadFlow AI Invoice',
      hosted_invoice_url: null,
      invoice_pdf: null,
      lines: {
        object: 'list',
        data: [],
        has_more: false,
        url: `/v1/invoices/${Date.now()}/lines`
      },
      period_end: Math.floor(new Date(new Date().setMonth(new Date().getMonth() + 1)).getTime() / 1000),
      period_start: Math.floor(new Date().getTime() / 1000),
      subtotal: 0,
      tax: null,
      total: 0
    };
  }

  async getBillingPortalUrl(customerId, returnUrl) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // const session = await this.stripe.billingPortal.sessions.create({
    //   customer: customerId,
    //   return_url: returnUrl,
    // });

    return {
      url: `${returnUrl}?portal=true&customer=${customerId}&timestamp=${Date.now()}`
    };
  }

  async getCheckoutSession(sessionId) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.checkout.sessions.retrieve(sessionId);

    // For stub, return a simulated session
    return {
      id: sessionId,
      object: 'checkout.session',
      billing_address_collection: 'auto',
      cancel_url: '',
      client_reference_id: null,
      customer: null,
      customer_email: null,
      livemode: false,
      locale: null,
      metadata: {},
      mode: 'subscription',
      payment_intent: null,
      payment_link: null,
      subscription: null,
      success_url: '',
      total_details: null,
      url: null
    };
  }

  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, trialDays = 14) {
    if (!this.enabled) {
      throw new Error('Stripe not initialized');
    }

    // In real implementation:
    // return await this.stripe.checkout.sessions.create({
    //   customer: customerId,
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [{
    //     price: priceId,
    //     quantity: 1,
    //   }],
    //   trial_period_days: trialDays,
    //   success_url: successUrl,
    //   cancel_url: cancelUrl,
    // });

    const sessionId = `cs_${Date.now()}`;
    return {
      id: sessionId,
      object: 'checkout.session',
      billing_address_collection: 'auto',
      cancel_url,
      client_reference_id: customerId,
      customer: customerId,
      customer_email: this.customers.get(customerId)?.email || null,
      livemode: false,
      locale: 'en',
      metadata: {},
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: this.prices.get(priceId),
        quantity: 1,
      }],
      subscription: null, // Will be populated after successful checkout
      success_url,
      total_details: {
        amount_discount: 0,
        amount_shipping: 0,
        amount_tax: 0
      },
      url: `https://checkout.stripe.com/pay/${sessionId}` // This would be a real URL
    };
  }

  // Helper method to get tier from price ID
  getTierFromPriceId(priceId) {
    const price = this.prices.get(priceId);
    if (!price) return 'unknown';
    
    const product = this.products.get(price.productId);
    if (!product) return 'unknown';
    
    if (product.name.toLowerCase().includes('starter')) return 'starter';
    if (product.name.toLowerCase().includes('growth')) return 'growth';
    if (product.name.toLowerCase().includes('pro')) return 'pro';
    
    return 'unknown';
  }

  // Helper method to get all subscriptions for a customer
  getCustomerSubscriptions(customerId) {
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.customer === customerId
    );
  }

  isEnabled() {
    return this.enabled;
  }
}

module.exports = StripeStub;
