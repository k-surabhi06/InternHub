/**
 * Seed script: populates the database with realistic dummy internship data.
 * Run with: npm run db:seed
 *
 * Uses upsert so it's safe to run multiple times.
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// NOTE: These are dummy entries for dev/testing only.
// isActive is set to false so they never appear in browse/search results.
// Real data comes from the ingestion scripts (unstopIngestion.js, internshala_scraper.py).
const dummyInternships = [
  {
    title: 'Frontend Developer Intern',
    company: 'TechMahindra',
    location: 'Bangalore',
    stipend: '₹15,000/month',
    duration: '3 months',
    description: 'Work with the React team on enterprise dashboards.',
    applyUrl: 'https://internshala.com/internship/frontend-techmahindra-001',
    source: 'Internshala',
    sourceId: 'internshala-001',
    isActive: false,
  },
  {
    title: 'Backend Developer Intern',
    company: 'Razorpay',
    location: 'Bangalore',
    stipend: '₹20,000/month',
    duration: '6 months',
    description: 'Help build payment gateway microservices using Node.js.',
    applyUrl: 'https://unstop.com/internship/backend-razorpay-001',
    source: 'Unstop',
    sourceId: 'unstop-001',
    isActive: false,
  },
  {
    title: 'Data Science Intern',
    company: 'Flipkart',
    location: 'Hyderabad',
    stipend: '₹25,000/month',
    duration: '4 months',
    description: 'Analyse product recommendation models using Python + Spark.',
    applyUrl: 'https://internshala.com/internship/data-science-flipkart-001',
    source: 'Internshala',
    sourceId: 'internshala-002',
    isActive: false,
  },
  {
    title: 'UI/UX Design Intern',
    company: 'Zomato',
    location: 'Delhi',
    stipend: '₹12,000/month',
    duration: '3 months',
    description: 'Design mobile-first experiences for the consumer app.',
    applyUrl: 'https://unstop.com/internship/ux-zomato-001',
    source: 'Unstop',
    sourceId: 'unstop-002',
    isActive: false,
  },
  {
    title: 'Machine Learning Intern',
    company: 'Google India',
    location: 'Hyderabad',
    stipend: '₹50,000/month',
    duration: '6 months',
    description: 'Contribute to ML infrastructure and model training pipelines.',
    applyUrl: 'https://internshala.com/internship/ml-google-001',
    source: 'Internshala',
    sourceId: 'internshala-003',
    isActive: false,
  },
  {
    title: 'Android Developer Intern',
    company: 'InMobi',
    location: 'Bangalore',
    stipend: '₹18,000/month',
    duration: '3 months',
    description: 'Build SDKs for the Android advertising platform.',
    applyUrl: 'https://unstop.com/internship/android-inmobi-001',
    source: 'Unstop',
    sourceId: 'unstop-003',
    isActive: false,
  },
  {
    title: 'DevOps Intern',
    company: 'Swiggy',
    location: 'Remote',
    stipend: '₹20,000/month',
    duration: '4 months',
    description: 'Manage Kubernetes clusters and CI/CD pipelines.',
    applyUrl: 'https://internshala.com/internship/devops-swiggy-001',
    source: 'Internshala',
    sourceId: 'internshala-004',
    isActive: false,
  },
  {
    title: 'Content Writing Intern',
    company: 'Byju\'s',
    location: 'Remote',
    stipend: '₹8,000/month',
    duration: '2 months',
    description: 'Create engaging learning content for K-12 students.',
    applyUrl: 'https://unstop.com/internship/content-byjus-001',
    source: 'Unstop',
    sourceId: 'unstop-004',
    isActive: false,
  },
  {
    title: 'Full Stack Developer Intern',
    company: 'Ola',
    location: 'Bangalore',
    stipend: '₹22,000/month',
    duration: '6 months',
    description: 'Develop features across the entire Ola Rides stack.',
    applyUrl: 'https://internshala.com/internship/fullstack-ola-001',
    source: 'Internshala',
    sourceId: 'internshala-005',
    isActive: false,
  },
  {
    title: 'Product Management Intern',
    company: 'Paytm',
    location: 'Noida',
    stipend: '₹30,000/month',
    duration: '3 months',
    description: 'Drive product discovery and roadmap for Paytm Money.',
    applyUrl: 'https://unstop.com/internship/pm-paytm-001',
    source: 'Unstop',
    sourceId: 'unstop-005',
    isActive: false,
  },
  {
    title: 'Cybersecurity Intern',
    company: 'HDFC Bank',
    location: 'Mumbai',
    stipend: '₹20,000/month',
    duration: '3 months',
    description: 'Perform vulnerability assessments on internal systems.',
    applyUrl: 'https://internshala.com/internship/cyber-hdfc-001',
    source: 'Internshala',
    sourceId: 'internshala-006',
    isActive: false,
  },
  {
    title: 'Marketing Analytics Intern',
    company: 'Meesho',
    location: 'Bangalore',
    stipend: '₹15,000/month',
    duration: '3 months',
    description: 'Analyse performance marketing campaigns using SQL and Tableau.',
    applyUrl: 'https://unstop.com/internship/marketing-meesho-001',
    source: 'Unstop',
    sourceId: 'unstop-006',
    isActive: false,
  },
];

async function main() {
  console.log('Seeding internships...');

  let created = 0;
  let skipped = 0;

  for (const internship of dummyInternships) {
    const result = await prisma.internship.upsert({
      where: { applyUrl: internship.applyUrl },
      create: internship,
      update: { isActive: false }, // keep inactive — these are dummy entries, not real listings
    });

    if (result.scrapedAt.toISOString() === result.scrapedAt.toISOString()) {
      // upsert always returns the record; count by checking field
      created++;
    }
  }

  console.log(`Done. Upserted ${dummyInternships.length} internships (${created} total).`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
