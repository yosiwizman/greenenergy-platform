/**
 * Seed script to import initial data from JobNimbus
 *
 * Usage:
 *   pnpm seed:jobnimbus
 *
 * Or directly:
 *   ts-node src/scripts/seed-jobnimbus.ts
 */

// import { ConfigService } from '@nestjs/config'; // Not used in standalone script
import {
  JobNimbusClient,
  transformJobNimbusJob,
  transformJobNimbusContact,
} from '@greenenergy/jobnimbus-sdk';
import { prisma } from '@greenenergy/db';

async function seed() {
  console.log('🌱 Starting JobNimbus data seed...\n');

  // Get configuration from environment
  const baseUrl = process.env.JOBNIMBUS_BASE_URL || 'https://api.jobnimbus.com';
  const apiKey = process.env.JOBNIMBUS_API_KEY;

  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error('❌ Error: JOBNIMBUS_API_KEY not configured');
    console.error('Please set JOBNIMBUS_API_KEY in your .env file');
    process.exit(1);
  }

  console.log(`📡 Connecting to JobNimbus API: ${baseUrl}\n`);

  const client = new JobNimbusClient({ baseUrl, apiKey });

  try {
    // Step 1: Seed Jobs
    console.log('📋 Fetching jobs from JobNimbus...');

    const allJobs = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const jobs = await client.fetchJobs({ limit, page });
      allJobs.push(...jobs);
      console.log(`  - Fetched page ${page}: ${jobs.length} jobs`);
      hasMore = jobs.length === limit;
      page++;
    }

    console.log(`\n✅ Total jobs fetched: ${allJobs.length}\n`);

    // Insert/update jobs
    console.log('💾 Inserting jobs into database...');
    let jobsInserted = 0;
    let jobsUpdated = 0;

    for (const jnJob of allJobs) {
      const jobData = transformJobNimbusJob(jnJob);

      const existing = await prisma.job.findUnique({
        where: { jobNimbusId: jnJob.jnid },
      });

      if (existing) {
        await prisma.job.update({
          where: { jobNimbusId: jnJob.jnid },
          data: jobData,
        });
        jobsUpdated++;
      } else {
        await prisma.job.create({
          data: {
            ...jobData,
            jobNimbusId: jnJob.jnid,
            customerName: jobData.customerName || '',
            address: jobData.address || '',
          },
        });
        jobsInserted++;
      }
    }

    console.log(`  - ${jobsInserted} jobs inserted`);
    console.log(`  - ${jobsUpdated} jobs updated\n`);

    // Step 2: Seed Contacts
    console.log('👥 Fetching contacts from JobNimbus...');

    const allContacts = [];
    page = 1;
    hasMore = true;

    while (hasMore) {
      const contacts = await client.fetchContacts({ limit, page });
      allContacts.push(...contacts);
      console.log(`  - Fetched page ${page}: ${contacts.length} contacts`);
      hasMore = contacts.length === limit;
      page++;
    }

    console.log(`\n✅ Total contacts fetched: ${allContacts.length}\n`);

    // Insert/update contacts
    console.log('💾 Inserting contacts into database...');
    let contactsInserted = 0;
    let contactsSkipped = 0;

    for (const jnContact of allContacts) {
      const contactData = transformJobNimbusContact(jnContact);

      // Find a related job (simplified - in real implementation, get from JobNimbus relationship)
      const job = await prisma.job.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (!job) {
        contactsSkipped++;
        continue;
      }

      await prisma.contact.upsert({
        where: { jobNimbusId: jnContact.jnid },
        create: {
          ...contactData,
          jobNimbusId: jnContact.jnid,
          name: contactData.name || '',
          role: contactData.role || 'CUSTOMER',
          jobId: job.id,
        },
        update: contactData,
      });
      contactsInserted++;
    }

    console.log(`  - ${contactsInserted} contacts inserted/updated`);
    console.log(`  - ${contactsSkipped} contacts skipped (no related job)\n`);

    // Summary
    console.log('✅ Seed completed successfully!\n');
    console.log('Summary:');
    console.log(`  Jobs: ${jobsInserted} inserted, ${jobsUpdated} updated`);
    console.log(`  Contacts: ${contactsInserted} inserted/updated\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error instanceof Error ? error.message : String(error));
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status: number; data: unknown } };
      if (axiosError.response) {
        console.error('API Response:', axiosError.response.status, axiosError.response.data);
      }
    }
    process.exit(1);
  }
}

// Run the seed
seed().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
