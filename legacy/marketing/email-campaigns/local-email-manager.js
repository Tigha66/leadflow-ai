// LeadFlow AI - Local Email Outreach Manager (JSON-based)
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer').default || require('nodemailer');
require('dotenv').config();

// File paths for JSON storage
const TARGET_BUSINESSES_FILE = path.join(__dirname, 'data', 'target-businesses.json');
const EMAIL_OUTREACH_FILE = path.join(__dirname, 'data', 'email-outreach.json');
const CAMPAIGNS_FILE = path.join(__dirname, 'data', 'campaigns.json');

// Create data directory if it doesn't exist
async function ensureDataDirectory() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Initialize data files with sample data if they don't exist
async function initializeDataFiles() {
  await ensureDataDirectory();
  
  // Initialize target businesses
  try {
    await fs.access(TARGET_BUSINESSES_FILE);
  } catch {
    const sampleBusinesses = [
      {
        id: 1,
        business_name: 'Johnson Family Dentistry',
        owner_name: 'Dr. Michael Johnson',
        business_type: 'dentist',
        phone: '(555) 123-4567',
        email: 'dr.johnson@johnsondentistry.com',
        website: 'www.johnsondentistry.com',
        address: '123 Main Street',
        city: 'Phoenix',
        state: 'AZ',
        zip_code: '85001',
        employees_count: 8,
        monthly_revenue_estimate: 85000.00,
        primary_contact: 'Dr. Michael Johnson',
        contact_title: 'Owner',
        source: 'google_search',
        discovery_date: new Date().toISOString(),
        last_contact_date: null,
        contact_attempts: 0,
        status: 'prospect',
        notes: 'Well-established practice in downtown Phoenix',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        business_name: 'Desert Oasis Med Spa',
        owner_name: 'Sarah Williams',
        business_type: 'medspa',
        phone: '(555) 234-5678',
        email: 'sarah@desertoasis.com',
        website: 'www.desertoasismedspa.com',
        address: '456 Wellness Blvd',
        city: 'Phoenix',
        state: 'AZ',
        zip_code: '85002',
        employees_count: 6,
        monthly_revenue_estimate: 65000.00,
        primary_contact: 'Sarah Williams',
        contact_title: 'Founder',
        source: 'yelp',
        discovery_date: new Date().toISOString(),
        last_contact_date: null,
        contact_attempts: 0,
        status: 'prospect',
        notes: 'Popular for anti-aging treatments',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        business_name: 'Arizona Roof Solutions',
        owner_name: 'Robert Davis',
        business_type: 'roofer',
        phone: '(555) 345-6789',
        email: 'bob@arizonaroofsolutions.com',
        website: 'www.arizonaroofsolutions.com',
        address: '789 Construction Ave',
        city: 'Phoenix',
        state: 'AZ',
        zip_code: '85003',
        employees_count: 12,
        monthly_revenue_estimate: 120000.00,
        primary_contact: 'Robert Davis',
        contact_title: 'CEO',
        source: 'bbb',
        discovery_date: new Date().toISOString(),
        last_contact_date: null,
        contact_attempts: 0,
        status: 'prospect',
        notes: 'Emergency repair specialists',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        business_name: 'Phoenix HVAC Experts',
        owner_name: 'James Wilson',
        business_type: 'hvac',
        phone: '(555) 456-7890',
        email: 'james@phoenixhvacs.com',
        website: 'www.phoenixhvacs.com',
        address: '321 Service Rd',
        city: 'Phoenix',
        state: 'AZ',
        zip_code: '85004',
        employees_count: 10,
        monthly_revenue_estimate: 95000.00,
        primary_contact: 'James Wilson',
        contact_title: 'Owner',
        source: 'google_my_business',
        discovery_date: new Date().toISOString(),
        last_contact_date: null,
        contact_attempts: 0,
        status: 'prospect',
        notes: 'Seasonal maintenance contracts',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 5,
        business_name: 'Southwest Legal Associates',
        owner_name: 'Jennifer Lee',
        business_type: 'legal',
        phone: '(555) 567-8901',
        email: 'jennifer@swlegal.com',
        website: 'www.swlegalassociates.com',
        address: '654 Justice Way',
        city: 'Phoenix',
        state: 'AZ',
        zip_code: '85005',
        employees_count: 7,
        monthly_revenue_estimate: 75000.00,
        primary_contact: 'Jennifer Lee',
        contact_title: 'Managing Partner',
        source: 'linkedin',
        discovery_date: new Date().toISOString(),
        last_contact_date: null,
        contact_attempts: 0,
        status: 'prospect',
        notes: 'Family law and estate planning',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    await fs.writeFile(TARGET_BUSINESSES_FILE, JSON.stringify(sampleBusinesses, null, 2));
    console.log('Created target businesses data file with sample data');
  }
  
  // Initialize email outreach
  try {
    await fs.access(EMAIL_OUTREACH_FILE);
  } catch {
    await fs.writeFile(EMAIL_OUTREACH_FILE, JSON.stringify([], null, 2));
    console.log('Created email outreach data file');
  }
  
  // Initialize campaigns
  try {
    await fs.access(CAMPAIGNS_FILE);
  } catch {
    const sampleCampaigns = [
      {
        id: 1,
        name: 'Local Business Outreach Q2',
        description: 'Outreach campaign targeting local service businesses in Phoenix area',
        start_date: new Date().toISOString(),
        target_count: 0,
        sent_count: 0,
        open_count: 0,
        click_count: 0,
        reply_count: 0,
        demo_scheduled_count: 0,
        conversion_count: 0,
        status: 'active',
        created_by: 'LeadFlow AI Marketing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(sampleCampaigns, null, 2));
    console.log('Created campaigns data file with sample campaign');
  }
}

// Read data from JSON file
async function readDataFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Write data to JSON file
async function writeDataFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

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

// Function to personalize email content
function personalizeEmail(template, business) {
  const location = `${business.city}, ${business.state}`;
  const senderName = process.env.EMAIL_SENDER_NAME || 'Alex from LeadFlow AI';
  const specificDetail = `your excellent work in ${business.business_type}`;
  
  return {
    subject: template.subject
      .replace('{{owner_name}}', business.owner_name || 'there')
      .replace('{{business_name}}', business.business_name)
      .replace('{{service_type}}', business.business_type)
      .replace('{{location}}', location),
    body: template.body
      .replace('{{owner_name}}', business.owner_name || 'there')
      .replace('{{business_name}}', business.business_name)
      .replace('{{service_type}}', business.business_type)
      .replace('{{location}}', location)
      .replace('{{sender_name}}', senderName)
      .replace('{{specific_detail}}', specificDetail)
  };
}

// Function to get random template
function getRandomTemplate() {
  const templates = Object.keys(emailTemplates);
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return { name: randomTemplate, ...emailTemplates[randomTemplate] };
}

// Function to create email transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
}

// Function to send email
async function sendEmail(business, templateName) {
  const transporter = createTransporter();
  const template = emailTemplates[templateName];
  const personalized = personalizeEmail(template, business);

  const mailOptions = {
    from: `"${process.env.EMAIL_SENDER_NAME || 'LeadFlow AI'}" <${process.env.EMAIL_USER || 'your-email@gmail.com'}>`,
    to: business.email,
    subject: personalized.subject,
    text: personalized.body
  };

  try {
    // In a real implementation, this would send the actual email
    // For demonstration, we'll just log what would be sent
    console.log(`\n📧 EMAIL WOULD BE SENT TO: ${business.business_name} (${business.email})`);
    console.log(`Subject: ${personalized.subject}`);
    console.log(`Template: ${templateName}`);
    console.log(`---`);
    console.log(personalized.body);
    console.log(`---\n`);
    
    // Simulate sending email
    const result = { messageId: `simulated-${Date.now()}`, success: true };
    
    // Record the email outreach
    const outreachRecords = await readDataFile(EMAIL_OUTREACH_FILE);
    const newOutreach = {
      id: outreachRecords.length > 0 ? Math.max(...outreachRecords.map(r => r.id)) + 1 : 1,
      business_id: business.id,
      campaign_name: 'Local Business Outreach Q2',
      template_used: templateName,
      subject_line: personalized.subject,
      email_content: personalized.body,
      sent_date: new Date().toISOString(),
      opened: false,
      open_date: null,
      clicked: false,
      click_date: null,
      replied: false,
      reply_date: null,
      reply_content: null,
      follow_up_required: false,
      follow_up_date: null,
      status: 'sent',
      created_at: new Date().toISOString()
    };
    
    outreachRecords.push(newOutreach);
    await writeDataFile(EMAIL_OUTREACH_FILE, outreachRecords);
    
    // Update business record
    const businesses = await readDataFile(TARGET_BUSINESSES_FILE);
    const businessIndex = businesses.findIndex(b => b.id === business.id);
    if (businessIndex !== -1) {
      businesses[businessIndex].contact_attempts += 1;
      businesses[businessIndex].last_contact_date = new Date().toISOString();
      businesses[businessIndex].status = 'contacted';
      businesses[businessIndex].updated_at = new Date().toISOString();
      
      await writeDataFile(TARGET_BUSINESSES_FILE, businesses);
    }
    
    // Update campaign stats
    const campaigns = await readDataFile(CAMPAIGNS_FILE);
    const campaignIndex = campaigns.findIndex(c => c.name === 'Local Business Outreach Q2');
    if (campaignIndex !== -1) {
      campaigns[campaignIndex].sent_count += 1;
      campaigns[campaignIndex].updated_at = new Date().toISOString();
      
      await writeDataFile(CAMPAIGNS_FILE, campaigns);
    }
    
    console.log(`✅ Email recorded for ${business.business_name} (${business.email})`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${business.business_name}:`, error);
    
    // Record failed email outreach
    const outreachRecords = await readDataFile(EMAIL_OUTREACH_FILE);
    const newOutreach = {
      id: outreachRecords.length > 0 ? Math.max(...outreachRecords.map(r => r.id)) + 1 : 1,
      business_id: business.id,
      campaign_name: 'Local Business Outreach Q2',
      template_used: templateName,
      subject_line: personalized.subject,
      email_content: personalized.body,
      sent_date: new Date().toISOString(),
      opened: false,
      open_date: null,
      clicked: false,
      click_date: null,
      replied: false,
      reply_date: null,
      reply_content: null,
      follow_up_required: false,
      follow_up_date: null,
      status: 'failed',
      created_at: new Date().toISOString()
    };
    
    outreachRecords.push(newOutreach);
    await writeDataFile(EMAIL_OUTREACH_FILE, outreachRecords);
    
    return { success: false, error: error.message };
  }
}

// Function to get target businesses for outreach
async function getTargetBusinesses(limit = 5) {
  const businesses = await readDataFile(TARGET_BUSINESSES_FILE);
  const eligibleBusinesses = businesses.filter(b => 
    b.status === 'prospect' && 
    b.contact_attempts < 3 && 
    b.email
  );
  
  // Shuffle and take the limit
  const shuffled = [...eligibleBusinesses].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, limit);
}

// Main function to run the email campaign
async function runEmailCampaign(batchSize = 5) {
  console.log('🚀 Starting LeadFlow AI email outreach campaign...');
  
  try {
    // Get target businesses
    const businesses = await getTargetBusinesses(batchSize);
    console.log(`📋 Found ${businesses.length} businesses for outreach`);
    
    if (businesses.length === 0) {
      console.log('❌ No businesses found for outreach');
      return;
    }
    
    // Send emails to businesses
    for (const business of businesses) {
      // Randomly select a template
      const templateKeys = Object.keys(emailTemplates);
      const randomTemplate = templateKeys[Math.floor(Math.random() * templateKeys.length)];
      
      console.log(`📤 Sending email to ${business.business_name} using ${randomTemplate} template...`);
      
      const result = await sendEmail(business, randomTemplate);
      
      if (result.success) {
        console.log(`✅ Successfully processed email for ${business.business_name}`);
      } else {
        console.log(`❌ Failed to process email for ${business.business_name}`);
      }
      
      // Add delay between emails to avoid spam detection
      console.log(`⏳ Waiting 5 seconds before next email...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('🎉 Email campaign batch completed successfully!');
    
    // Show summary
    const outreachRecords = await readDataFile(EMAIL_OUTREACH_FILE);
    const sentEmails = outreachRecords.filter(e => e.status === 'sent').length;
    console.log(`📊 Campaign Summary: ${sentEmails} emails sent in this batch`);
  } catch (error) {
    console.error('❌ Error running email campaign:', error);
  }
}

// Function to show campaign statistics
async function showStatistics() {
  const businesses = await readDataFile(TARGET_BUSINESSES_FILE);
  const outreach = await readDataFile(EMAIL_OUTREACH_FILE);
  const campaigns = await readDataFile(CAMPAIGNS_FILE);
  
  console.log('\n📈 CAMPAIGN STATISTICS:');
  console.log(`Total Target Businesses: ${businesses.length}`);
  console.log(`Contacted Businesses: ${businesses.filter(b => b.status !== 'prospect').length}`);
  console.log(`Active Prospects: ${businesses.filter(b => b.status === 'prospect').length}`);
  console.log(`Emails Sent: ${outreach.length}`);
  console.log(`Active Campaigns: ${campaigns.length}`);
  
  if (campaigns.length > 0) {
    const campaign = campaigns[0]; // Using first campaign
    console.log(`\n📊 Campaign "${campaign.name}" Details:`);
    console.log(`  Status: ${campaign.status}`);
    console.log(`  Emails Sent: ${campaign.sent_count}`);
    console.log(`  Estimated Revenue Potential: $${(businesses.reduce((sum, b) => sum + (b.monthly_revenue_estimate || 0), 0) * 0.1).toLocaleString()} (10% of estimated revenue)`);
  }
}

// Main execution
async function main() {
  try {
    console.log('🔧 Initializing LeadFlow AI Email Outreach System...\n');
    
    await initializeDataFiles();
    await showStatistics();
    
    console.log('\n📧 Running email campaign...\n');
    await runEmailCampaign(3); // Send to 3 businesses in this demo
    
    console.log('\n📊 Final statistics:');
    await showStatistics();
    
    console.log('\n💡 Next Steps:');
    console.log('- Set up actual email credentials in environment variables');
    console.log('- Customize email templates for your specific market');
    console.log('- Expand the target business database');
    console.log('- Implement reply tracking and follow-up sequences');
    console.log('- Schedule regular campaign runs');
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runEmailCampaign,
  showStatistics,
  getTargetBusinesses,
  sendEmail,
  initializeDataFiles
};