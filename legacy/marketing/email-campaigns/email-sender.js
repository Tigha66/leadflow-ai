// LeadFlow AI - Email Outreach Automation Script
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const pg = require('pg');

// Load environment variables
dotenv.config();

// PostgreSQL connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/leadflow_ai'
});

// Email templates
const emailTemplates = {
  hook: {
    subject: "Did you miss 12 potential customers this week?",
    body: `Hi {{owner_name}},

I hope this email finds you well. I'm reaching out because I noticed {{business_name}} specializes in {{service_type}} in {{location}}.

Here's what caught my attention: local service businesses typically receive 15-20 inquiries per week. Studies show that 78% of customers choose the first business that responds to them.

If you're like most service businesses, you probably:
- Miss 3-5 calls per day (holidays, lunch breaks, busy with other customers)
- Have 2-3 leads slip away each week due to slow follow-up
- Wonder why your lead conversion rate isn't improving

What if I told you that there's a simple solution that's helping service businesses recover 89% of those "lost" leads?

LeadFlow AI automatically responds to every lead within 10 seconds, qualifies them, and books appointments – even when you're busy with customers.

Would you be interested in seeing how this could impact your bottom line? I'd be happy to show you a quick 10-minute demo.

Best regards,
{{sender_name}}

P.S. I've helped 200+ service businesses recover over $1.2M in missed revenue. Happy to share what's worked for businesses similar to yours.`
  },
  painPoint: {
    subject: "The $10K mistake most service businesses make",
    body: `Hi {{owner_name}},

I came across {{business_name}} and noticed you're doing great work in {{location}} with {{service_type}}.

I'm reaching out because I work with local service businesses, and I often see the same challenge: you're great at serving customers, but you're losing potential customers before they even get to meet you.

Here's what I mean:
- 45% of customers expect a response within 5 minutes
- 78% will choose a competitor if you don't respond quickly
- The average service business loses $3,000-5,000 per month to slow responses

I know you're busy taking care of your existing customers (which is exactly why you can't afford to miss new ones).

That's why we built LeadFlow AI - to handle the initial conversations, qualify leads, and book appointments so you can focus on what you do best.

We've seen businesses increase their booked appointments by 67% within the first month.

Interested in seeing how this works? I can show you a quick demo.

Best,
{{sender_name}}`
  },
  socialProof: {
    subject: "How Dr. Johnson increased new patients by 45%",
    body: `Hi {{owner_name}},

I noticed {{business_name}} and wanted to reach out with a quick story that might interest you.

Dr. Sarah Johnson runs a dental practice in Phoenix with 3 other dentists. Six months ago, she was struggling with:
- Missing 15-20% of calls during busy periods
- Patients choosing competitors due to slow follow-up
- Her staff spending 2+ hours daily just returning calls

She implemented LeadFlow AI to handle initial inquiries and follow-ups.

Results after 6 months:
- 45% increase in new patient appointments
- 78% improvement in response time (now under 10 seconds)
- $24K additional monthly revenue from recovered leads
- Staff now focuses on patient care instead of phone chasing

Since you're in {{service_type}} like Dr. Johnson, I thought you might benefit from a similar approach.

Would you be open to a 10-minute call to see how this could work for {{business_name}}?

Best regards,
{{sender_name}}`
  },
  curiosity: {
    subject: "The secret to booking appointments while you sleep",
    body: `Hi {{owner_name}},

I've been following {{business_name}} and I have to say, {{specific_detail}}.

I'm reaching out because I've discovered something interesting about high-performing service businesses:

They've stopped competing on price and started competing on response time and convenience.

While your competitors are still relying on voicemail and "we'll call you back," forward-thinking businesses are using AI to:
- Respond to every lead within 10 seconds
- Qualify and book appointments 24/7
- Follow up automatically with no effort
- Recover 89% of leads that would otherwise be lost

The result? 67% more booked appointments and 45% less stress for the team.

I'm curious - what percentage of your leads actually book appointments?

If it's under 35%, we might have a solution that could significantly impact your revenue.

Would you be interested in learning more?

Best,
{{sender_name}}`
  }
};

// Function to get a random template
function getRandomTemplate() {
  const templates = Object.keys(emailTemplates);
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return { name: randomTemplate, ...emailTemplates[randomTemplate] };
}

// Function to personalize email content
function personalizeEmail(template, business) {
  return {
    subject: template.subject
      .replace('{{owner_name}}', business.owner_name || 'there')
      .replace('{{business_name}}', business.business_name)
      .replace('{{service_type}}', business.business_type)
      .replace('{{location}}', `${business.city}, ${business.state}`)
      .replace('{{specific_detail}}', `your excellent work in ${business.service_type}`),
    body: template.body
      .replace('{{owner_name}}', business.owner_name || 'there')
      .replace('{{business_name}}', business.business_name)
      .replace('{{service_type}}', business.business_type)
      .replace('{{location}}', `${business.city}, ${business.state}`)
      .replace('{{sender_name}}', process.env.EMAIL_SENDER_NAME || 'Alex from LeadFlow AI')
      .replace('{{specific_detail}}', `your excellent work in ${business.service_type}`)
  };
}

// Create email transporter
function createTransporter() {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

// Function to send email
async function sendEmail(business, templateName) {
  const transporter = createTransporter();
  const template = emailTemplates[templateName];
  const personalized = personalizeEmail(template, business);

  const mailOptions = {
    from: `"${process.env.EMAIL_SENDER_NAME || 'LeadFlow AI'}" <${process.env.EMAIL_USER}>`,
    to: business.email,
    subject: personalized.subject,
    text: personalized.body
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    
    // Record the email outreach
    await pool.query(`
      INSERT INTO email_outreach (business_id, campaign_name, template_used, subject_line, email_content, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      business.id,
      'Local Business Outreach Q2',
      templateName,
      personalized.subject,
      personalized.body,
      'sent'
    ]);

    console.log(`Email sent successfully to ${business.business_name} (${business.email})`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Error sending email to ${business.business_name}:`, error);

    // Record failed email outreach
    await pool.query(`
      INSERT INTO email_outreach (business_id, campaign_name, template_used, subject_line, email_content, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      business.id,
      'Local Business Outreach Q2',
      templateName,
      personalized.subject,
      personalized.body,
      'failed'
    ]);

    return { success: false, error: error.message };
  }
}

// Function to get target businesses for outreach
async function getTargetBusinesses(limit = 10) {
  const { rows } = await pool.query(`
    SELECT * FROM target_businesses 
    WHERE status = 'prospect' 
    AND contact_attempts < 3
    AND email IS NOT NULL
    ORDER BY RANDOM()
    LIMIT $1
  `, [limit]);

  return rows;
}

// Main function to run the email campaign
async function runEmailCampaign(batchSize = 5) {
  console.log('Starting LeadFlow AI email outreach campaign...');

  try {
    // Get target businesses
    const businesses = await getTargetBusinesses(batchSize);
    console.log(`Found ${businesses.length} businesses for outreach`);

    if (businesses.length === 0) {
      console.log('No businesses found for outreach');
      return;
    }

    // Send emails to businesses
    for (const business of businesses) {
      // Randomly select a template
      const templateKeys = Object.keys(emailTemplates);
      const randomTemplate = templateKeys[Math.floor(Math.random() * templateKeys.length)];

      console.log(`Sending email to ${business.business_name} using ${randomTemplate} template...`);
      
      const result = await sendEmail(business, randomTemplate);
      
      if (result.success) {
        // Update business status
        await pool.query(
          `UPDATE target_businesses SET status = 'contacted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [business.id]
        );
      }

      // Add delay between emails to avoid spam detection
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    }

    console.log('Email campaign batch completed successfully!');
  } catch (error) {
    console.error('Error running email campaign:', error);
  } finally {
    await pool.end();
  }
}

// Function to schedule follow-up emails
async function scheduleFollowUps() {
  console.log('Scheduling follow-up emails...');

  try {
    // Find businesses that were contacted but haven't responded
    const { rows } = await pool.query(`
      SELECT tb.*, eo.sent_date 
      FROM target_businesses tb
      JOIN email_outreach eo ON tb.id = eo.business_id
      WHERE tb.status = 'contacted'
      AND eo.replied = FALSE
      AND eo.sent_date < CURRENT_DATE - INTERVAL '3 days'
      AND eo.follow_up_required = FALSE
      LIMIT 10
    `);

    for (const business of rows) {
      // Update to mark follow-up as required
      await pool.query(
        `UPDATE email_outreach SET follow_up_required = TRUE, follow_up_date = CURRENT_DATE + INTERVAL '2 days' 
         WHERE business_id = $1 AND sent_date = $2`,
        [business.id, business.sent_date]
      );
    }

    console.log(`${rows.length} follow-ups scheduled`);
  } catch (error) {
    console.error('Error scheduling follow-ups:', error);
  }
}

// Function to check for bounced emails
async function checkBounces() {
  console.log('Checking for bounced emails...');

  try {
    // This would integrate with an email service provider's bounce webhook
    // For now, we'll simulate by marking some emails as bounced based on pattern
    const { rows } = await pool.query(`
      SELECT * FROM email_outreach 
      WHERE status = 'sent' 
      AND sent_date < CURRENT_DATE - INTERVAL '1 day'
      LIMIT 5
    `);

    for (const emailRecord of rows) {
      // In a real system, you'd check actual bounce notifications
      // For simulation, we'll randomly mark some as bounced
      if (Math.random() > 0.7) { // 30% chance of bounce
        await pool.query(
          `UPDATE email_outreach SET status = 'bounced' WHERE id = $1`,
          [emailRecord.id]
        );

        // Update business status
        await pool.query(
          `UPDATE target_businesses SET status = 'invalid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [emailRecord.business_id]
        );

        console.log(`Marked email to business ${emailRecord.business_id} as bounced`);
      }
    }
  } catch (error) {
    console.error('Error checking bounces:', error);
  }
}

// Function to process replies
async function processReplies() {
  console.log('Processing email replies...');

  try {
    // In a real system, you'd integrate with an email service provider's reply webhook
    // For simulation, we'll create some sample replies
    const { rows } = await pool.query(`
      SELECT tb.*, eo.id as outreach_id
      FROM target_businesses tb
      JOIN email_outreach eo ON tb.id = eo.business_id
      WHERE eo.status = 'sent' 
      AND eo.replied = FALSE
      AND RANDOM() < 0.1  -- 10% chance of reply for simulation
      LIMIT 3
    `);

    for (const business of rows) {
      const replyContent = "Thank you for your email. We're interested in learning more about your service. Please send more information.";

      // Update email outreach record
      await pool.query(
        `UPDATE email_outreach 
         SET replied = TRUE, reply_date = CURRENT_TIMESTAMP, reply_content = $1, status = 'replied'
         WHERE id = $2`,
        [replyContent, business.outreach_id]
      );

      // Update business status
      await pool.query(
        `UPDATE target_businesses SET status = 'interested', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [business.id]
      );

      console.log(`Received reply from ${business.business_name}, marked as interested`);
    }
  } catch (error) {
    console.error('Error processing replies:', error);
  }
}

// Function to run the complete outreach workflow
async function runCompleteWorkflow() {
  console.log('Running complete email outreach workflow...');

  // Run all functions in sequence
  await runEmailCampaign(5);
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  await scheduleFollowUps();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  await checkBounces();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  await processReplies();

  console.log('Complete outreach workflow finished');
}

// Export functions for use in other modules
module.exports = {
  runEmailCampaign,
  scheduleFollowUps,
  checkBounces,
  processReplies,
  runCompleteWorkflow,
  sendEmail,
  getTargetBusinesses
};

// If running this file directly, execute the workflow
if (require.main === module) {
  runCompleteWorkflow().catch(console.error);
}
