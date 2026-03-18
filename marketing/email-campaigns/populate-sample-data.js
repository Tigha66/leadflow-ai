// Script to populate sample data for LeadFlow AI email campaigns
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/leadflow_ai'
});

// Sample business data
const sampleBusinesses = [
  {
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
    contact_title: 'Owner'
  },
  {
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
    contact_title: 'Founder'
  },
  {
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
    contact_title: 'CEO'
  },
  {
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
    contact_title: 'Owner'
  },
  {
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
    contact_title: 'Managing Partner'
  },
  {
    business_name: 'ABC Plumbing Services',
    owner_name: 'Thomas Anderson',
    business_type: 'plumber',
    phone: '(555) 678-9012',
    email: 'thomas@abcplumbing.com',
    website: 'www.abcplumbing.com',
    address: '987 Water St',
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85006',
    employees_count: 5,
    monthly_revenue_estimate: 55000.00,
    primary_contact: 'Thomas Anderson',
    contact_title: 'Owner'
  },
  {
    business_name: 'Desert Electric Solutions',
    owner_name: 'Maria Garcia',
    business_type: 'electrician',
    phone: '(555) 789-0123',
    email: 'maria@desertelectric.com',
    website: 'www.desertelectricsolutions.com',
    address: '147 Power Ave',
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85007',
    employees_count: 6,
    monthly_revenue_estimate: 60000.00,
    primary_contact: 'Maria Garcia',
    contact_title: 'President'
  },
  {
    business_name: 'Green Thumb Landscaping',
    owner_name: 'David Thompson',
    business_type: 'landscaper',
    phone: '(555) 890-1234',
    email: 'david@greenthumb.com',
    website: 'www.greenthumblandscape.com',
    address: '258 Garden Ln',
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85008',
    employees_count: 8,
    monthly_revenue_estimate: 70000.00,
    primary_contact: 'David Thompson',
    contact_title: 'Founder'
  },
  {
    business_name: 'Prime Cleaning Services',
    owner_name: 'Lisa Chang',
    business_type: 'cleaning',
    phone: '(555) 901-2345',
    email: 'lisa@primecleaning.com',
    website: 'www.primecleaningservices.com',
    address: '369 Sparkle Dr',
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85009',
    employees_count: 10,
    monthly_revenue_estimate: 45000.00,
    primary_contact: 'Lisa Chang',
    contact_title: 'Operations Manager'
  },
  {
    business_name: 'Precision Painting Co',
    owner_name: 'Robert Martinez',
    business_type: 'painting',
    phone: '(555) 012-3456',
    email: 'robert@precisionpainting.com',
    website: 'www.precisionpaintingco.com',
    address: '741 Color St',
    city: 'Phoenix',
    state: 'AZ',
    zip_code: '85010',
    employees_count: 7,
    monthly_revenue_estimate: 50000.00,
    primary_contact: 'Robert Martinez',
    contact_title: 'Owner'
  }
];

// Function to populate the database
async function populateDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Populating target businesses...');
    
    for (const business of sampleBusinesses) {
      // Check if business already exists
      const existing = await client.query(
        'SELECT id FROM target_businesses WHERE email = $1',
        [business.email]
      );
      
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO target_businesses (
            business_name, owner_name, business_type, phone, email, website, 
            address, city, state, zip_code, employees_count, 
            monthly_revenue_estimate, primary_contact, contact_title
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          business.business_name,
          business.owner_name,
          business.business_type,
          business.phone,
          business.email,
          business.website,
          business.address,
          business.city,
          business.state,
          business.zip_code,
          business.employees_count,
          business.monthly_revenue_estimate,
          business.primary_contact,
          business.contact_title
        ]);
        
        console.log(`Added: ${business.business_name}`);
      } else {
        console.log(`Skipped (exists): ${business.business_name}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('Database population completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error populating database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Function to create email campaigns
async function createEmailCampaigns() {
  const client = await pool.connect();
  
  try {
    console.log('Creating email campaigns...');
    
    // Check if campaigns already exist
    const existingCampaigns = await client.query(
      'SELECT id FROM email_campaigns WHERE name = $1',
      ['Local Business Outreach Q2']
    );
    
    if (existingCampaigns.rows.length === 0) {
      await client.query(`
        INSERT INTO email_campaigns (name, description, status, created_by)
        VALUES ($1, $2, $3, $4)
      `, [
        'Local Business Outreach Q2',
        'Outreach campaign targeting local service businesses in Phoenix area',
        'active',
        'LeadFlow AI Marketing'
      ]);
      
      console.log('Created: Local Business Outreach Q2 campaign');
    } else {
      console.log('Skipped (exists): Local Business Outreach Q2 campaign');
    }
    
    // Create a second campaign
    const existingFollowupCampaign = await client.query(
      'SELECT id FROM email_campaigns WHERE name = $1',
      ['Follow-up Campaign']
    );
    
    if (existingFollowupCampaign.rows.length === 0) {
      await client.query(`
        INSERT INTO email_campaigns (name, description, status, created_by)
        VALUES ($1, $2, $3, $4)
      `, [
        'Follow-up Campaign',
        'Follow-up emails for businesses that showed initial interest',
        'active',
        'LeadFlow AI Marketing'
      ]);
      
      console.log('Created: Follow-up Campaign');
    } else {
      console.log('Skipped (exists): Follow-up Campaign');
    }
  } catch (err) {
    console.error('Error creating campaigns:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Main execution function
async function main() {
  try {
    console.log('Starting LeadFlow AI sample data population...\n');
    
    await populateDatabase();
    await createEmailCampaigns();
    
    console.log('\nSample data population completed successfully!');
    console.log(`Added ${sampleBusinesses.length} businesses to the outreach list.`);
    
    // Show summary
    const client = await pool.connect();
    try {
      const businessCount = await client.query('SELECT COUNT(*) FROM target_businesses');
      const campaignCount = await client.query('SELECT COUNT(*) FROM email_campaigns');
      
      console.log(`\nDatabase Summary:`);
      console.log(`- Total businesses: ${businessCount.rows[0].count}`);
      console.log(`- Total campaigns: ${campaignCount.rows[0].count}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to populate sample data:', error);
  } finally {
    await pool.end();
  }
}

// Run the script if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  populateDatabase,
  createEmailCampaigns,
  sampleBusinesses
};
