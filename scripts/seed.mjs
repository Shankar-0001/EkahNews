import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env') });

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('🚀 Starting News CMS Database Seeding...\n');

// Helper function to handle errors
function handleError(operation, error) {
  console.error(`❌ Error during ${operation}:`, error.message);
  if (error.details) console.error('Details:', error.details);
  if (error.hint) console.error('Hint:', error.hint);
}

// Step 1: Create Users via Supabase Auth
async function createUsers() {
  console.log('📝 Step 1: Creating users via Supabase Auth...');

  const usersToCreate = [
    {
      email: 'admin@newscms.com',
      password: 'Admin@123456',
      role: 'admin',
      name: 'Admin User',
      bio: 'System Administrator'
    },
    {
      email: 'john.doe@ekahnews.com',
      password: 'Author@123456',
      role: 'author',
      name: 'John Doe',
      bio: 'Senior Technology Correspondent with 10 years of experience covering AI, blockchain, and innovation.'
    },
    {
      email: 'sarah.johnson@ekahnews.com',
      password: 'Author@123456',
      role: 'author',
      name: 'Sarah Johnson',
      bio: 'Health and Wellness Reporter specializing in nutrition, fitness, and medical breakthroughs.'
    },
    {
      email: 'michael.chen@ekahnews.com',
      password: 'Author@123456',
      role: 'author',
      name: 'Michael Chen',
      bio: 'Business and Finance Journalist covering markets, startups, and economic trends.'
    },
    {
      email: 'emma.williams@ekahnews.com',
      password: 'Author@123456',
      role: 'author',
      name: 'Emma Williams',
      bio: 'Climate and Environmental Reporter focused on sustainability and green technology.'
    }
  ];

  const createdUsers = [];

  for (const userData of usersToCreate) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users?.some(u => u.email === userData.email);

      if (userExists) {
        console.log(`  ⏭️  User ${userData.email} already exists, skipping...`);
        // Get the existing user
        const existing = existingUser.users.find(u => u.email === userData.email);
        createdUsers.push({
          id: existing.id,
          email: userData.email,
          role: userData.role,
          name: userData.name,
          bio: userData.bio
        });
        continue;
      }

      // Create user via Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          role: userData.role,
          name: userData.name
        }
      });

      if (authError) {
        handleError(`creating user ${userData.email}`, authError);
        continue;
      }

      console.log(`  ✅ Created user: ${userData.email} (${authUser.user.id})`);

      // Insert into public.users table with the auth user's ID
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: userData.email,
          role: userData.role
        });

      if (userError && userError.code !== '23505') { // Ignore duplicate key errors
        handleError(`inserting user ${userData.email} into public.users`, userError);
      }

      createdUsers.push({
        id: authUser.user.id,
        email: userData.email,
        role: userData.role,
        name: userData.name,
        bio: userData.bio
      });

    } catch (error) {
      handleError(`creating user ${userData.email}`, error);
    }
  }

  console.log(`\n✅ Created ${createdUsers.length} users\n`);
  return createdUsers;
}

// Step 2: Create Authors
async function createAuthors(users) {
  console.log('📝 Step 2: Creating authors...');
  const authors = [];

  for (const user of users) {
    try {
      // Check if author already exists
      const { data: existing } = await supabase
        .from('authors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        console.log(`  ⏭️  Author for ${user.email} already exists`);
        authors.push({ ...existing, user_id: user.id, name: user.name });
        continue;
      }

      const { data, error } = await supabase
        .from('authors')
        .insert({
          user_id: user.id,
          name: user.name,
          bio: user.bio,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
        })
        .select()
        .single();

      if (error) {
        handleError(`creating author for ${user.email}`, error);
        continue;
      }

      console.log(`  ✅ Created author: ${user.name} (${data.id})`);
      authors.push(data);
    } catch (error) {
      handleError(`creating author for ${user.email}`, error);
    }
  }

  console.log(`\n✅ Created ${authors.length} authors\n`);
  return authors;
}

// Step 3: Create Categories
async function createCategories() {
  console.log('📝 Step 3: Creating categories...');

  const categories = [
    { name: 'Technology', slug: 'technology' },
    { name: 'Business', slug: 'business' },
    { name: 'Health', slug: 'health' },
    { name: 'Science', slug: 'science' },
    { name: 'Sports', slug: 'sports' },
    { name: 'Lifestyle', slug: 'lifestyle' },
    { name: 'Politics', slug: 'politics' },
    { name: 'Environment', slug: 'environment' },
    { name: 'Education', slug: 'education' },
    { name: 'Travel', slug: 'travel' }
  ];

  const createdCategories = [];

  for (const category of categories) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .upsert(category, { onConflict: 'slug', ignoreDuplicates: false })
        .select()
        .single();

      if (error && error.code !== '23505') {
        handleError(`creating category ${category.name}`, error);
        continue;
      }

      if (data) {
        console.log(`  ✅ Created category: ${category.name}`);
        createdCategories.push(data);
      }
    } catch (error) {
      handleError(`creating category ${category.name}`, error);
    }
  }

  console.log(`\n✅ Created ${createdCategories.length} categories\n`);
  return createdCategories;
}

// Step 4: Create Tags
async function createTags() {
  console.log('📝 Step 4: Creating tags...');

  const tags = [
    { name: 'AI', slug: 'ai' },
    { name: 'Machine Learning', slug: 'machine-learning' },
    { name: 'Blockchain', slug: 'blockchain' },
    { name: 'Cryptocurrency', slug: 'cryptocurrency' },
    { name: 'Innovation', slug: 'innovation' },
    { name: 'Startup', slug: 'startup' },
    { name: 'Research', slug: 'research' },
    { name: 'Breaking News', slug: 'breaking-news' },
    { name: 'Climate Change', slug: 'climate-change' },
    { name: 'Sustainability', slug: 'sustainability' },
    { name: 'Nutrition', slug: 'nutrition' },
    { name: 'Mental Health', slug: 'mental-health' },
    { name: 'Remote Work', slug: 'remote-work' },
    { name: 'Electric Vehicles', slug: 'electric-vehicles' },
    { name: 'Space', slug: 'space' }
  ];

  const createdTags = [];

  for (const tag of tags) {
    try {
      const { data, error } = await supabase
        .from('tags')
        .upsert(tag, { onConflict: 'slug', ignoreDuplicates: false })
        .select()
        .single();

      if (error && error.code !== '23505') {
        handleError(`creating tag ${tag.name}`, error);
        continue;
      }

      if (data) {
        createdTags.push(data);
      }
    } catch (error) {
      handleError(`creating tag ${tag.name}`, error);
    }
  }

  console.log(`✅ Created ${createdTags.length} tags\n`);
  return createdTags;
}

// Step 5: Create Articles
async function createArticles(authors, categories, tags) {
  console.log('📝 Step 5: Creating articles...');

  if (authors.length === 0 || categories.length === 0) {
    console.error('❌ Cannot create articles without authors and categories');
    return [];
  }

  const techCat = categories.find(c => c.slug === 'technology');
  const businessCat = categories.find(c => c.slug === 'business');
  const healthCat = categories.find(c => c.slug === 'health');
  const envCat = categories.find(c => c.slug === 'environment');

  const articles = [
    {
      title: 'Artificial Intelligence Revolutionizes Healthcare Diagnostics in 2025',
      slug: 'ai-revolutionizes-healthcare-2025',
      excerpt: 'AI systems are detecting diseases with 98% accuracy, transforming modern medicine and saving countless lives.',
      content: '<h2>The Future of Medicine is Here</h2><p>Artificial intelligence is transforming healthcare with unprecedented diagnostic accuracy. Recent studies show AI tools can detect diseases with 98% accuracy, matching or exceeding human doctors in many cases.</p><h3>Key Benefits</h3><ul><li>98% diagnostic accuracy across multiple conditions</li><li>40% faster diagnosis times</li><li>35% reduction in medical errors</li><li>Improved accessibility to quality healthcare</li></ul><p>Major hospitals worldwide are implementing AI diagnostic systems with remarkable results. The technology is particularly effective in radiology, pathology, and early disease detection.</p><p>Dr. Sarah Chen, Chief Medical Officer at Stanford Health, notes: "AI is not replacing doctors, but empowering them to make better, faster decisions that save lives."</p>',
      category_id: techCat?.id,
      author_id: authors[1]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200',
      seo_title: 'AI Revolutionizes Healthcare Diagnostics in 2025 | News CMS',
      seo_description: 'Discover how artificial intelligence is transforming healthcare with 98% diagnostic accuracy.'
    },
    {
      title: 'Bitcoin Surpasses $75,000 as Institutions Invest Heavily',
      slug: 'bitcoin-surpasses-75000-2025',
      excerpt: 'Cryptocurrency reaches new all-time highs driven by institutional adoption and improved regulatory clarity.',
      content: '<h2>Historic Crypto Market Surge</h2><p>Bitcoin has broken through the $75,000 barrier, driven by massive institutional investment and improved regulatory frameworks worldwide.</p><h3>Market Data</h3><ul><li>Bitcoin price: $75,432 (+127% YoY)</li><li>Total market cap: $3.2 trillion</li><li>Daily trading volume: $142 billion</li><li>Institutional holdings up 250%</li></ul><p>Financial experts predict continued growth as more major institutions enter the market. Companies like BlackRock, Fidelity, and JPMorgan have significantly increased their crypto holdings.</p><p>The surge comes after several countries implemented clear regulatory frameworks, reducing uncertainty and encouraging investment.</p>',
      category_id: businessCat?.id,
      author_id: authors[3]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200',
      seo_title: 'Bitcoin Hits $75,000: Institutional Investment Drives Growth',
      seo_description: 'Bitcoin reaches new heights as major institutions invest heavily in cryptocurrency markets.'
    },
    {
      title: 'Daily 15-Minute Walks Reduce Heart Disease Risk by 23%, Study Shows',
      slug: 'daily-walks-reduce-heart-disease-2025',
      excerpt: 'Groundbreaking 10-year research shows even minimal exercise has major cardiovascular and mental health benefits.',
      content: '<h2>Simple Exercise, Profound Results</h2><p>A comprehensive 10-year study of 50,000 participants shows that just 15 minutes of walking per day can significantly reduce cardiovascular disease risk and improve mental health.</p><h3>Key Findings</h3><ul><li>23% lower heart disease risk</li><li>18% reduction in depression rates</li><li>Improved sleep quality by 31%</li><li>Enhanced cognitive function</li></ul><p>Dr. Emily Rodriguez, lead researcher, states: "The results are clear - even small amounts of daily movement can have transformative health impacts."</p><p>Health experts recommend starting with just 5 minutes and gradually increasing duration. The study found consistency matters more than intensity.</p>',
      category_id: healthCat?.id,
      author_id: authors[2]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200',
      seo_title: '15-Minute Daily Walks Cut Heart Disease Risk by 23%',
      seo_description: 'New research reveals the remarkable health benefits of brief daily walking routines.'
    },
    {
      title: 'Climate Tech Startups Raise Record $50 Billion in 2024',
      slug: 'climate-tech-funding-50-billion-2024',
      excerpt: 'Investment in climate technology reaches unprecedented levels as urgency grows and solutions scale.',
      content: '<h2>Climate Tech Investment Boom</h2><p>Climate technology startups raised a record-breaking $50 billion in 2024, reflecting growing urgency around climate change and recognition of technological solutions.</p><h3>Investment Breakdown</h3><ul><li>Carbon capture: $12 billion</li><li>Renewable energy storage: $15 billion</li><li>Alternative proteins: $8 billion</li><li>Sustainable materials: $7 billion</li><li>Other green tech: $8 billion</li></ul><p>Several breakthrough technologies have reached commercial viability, attracting both venture capital and corporate investment.</p><p>Notable successes include advanced battery technologies with 3x energy density and carbon capture systems achieving $50/ton cost targets.</p>',
      category_id: envCat?.id,
      author_id: authors[4]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=1200',
      seo_title: 'Climate Tech Raises Record $50B: Green Innovation Boom',
      seo_description: 'Climate technology startups attract unprecedented investment as solutions scale commercially.'
    },
    {
      title: 'Remote Work Productivity Increases 13% When Implemented Correctly',
      slug: 'remote-work-productivity-increase-2025',
      excerpt: 'Comprehensive analysis of 10,000 companies reveals the secrets to successful remote work implementation.',
      content: '<h2>The Remote Work Revolution</h2><p>Analysis of remote work data from 10,000 companies shows productivity increases by 13% on average when implemented with proper tools, culture, and practices.</p><h3>Success Factors</h3><ul><li>Clear communication channels and protocols</li><li>Flexible schedules that respect work-life balance</li><li>Results-focused performance metrics</li><li>Regular virtual team connection activities</li><li>Proper technology infrastructure</li></ul><p>Companies that embrace well-structured remote work report 27% higher employee satisfaction and 31% better retention rates.</p><p>The study found that hybrid models combining remote and office work showed the highest productivity gains.</p>',
      category_id: businessCat?.id,
      author_id: authors[3]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200',
      seo_title: 'Remote Work Boosts Productivity 13% With Right Approach',
      seo_description: 'Learn how proper remote work implementation drives productivity and employee satisfaction.'
    },
    {
      title: 'Mediterranean Diet Linked to 40% Lower Chronic Disease Risk',
      slug: 'mediterranean-diet-health-benefits-2025',
      excerpt: 'Largest-ever nutrition study reveals dramatic health benefits of Mediterranean eating patterns.',
      content: '<h2>Diet and Longevity Connection</h2><p>A groundbreaking 20-year study of 500,000 participants shows the Mediterranean diet reduces chronic disease risk by up to 40%.</p><h3>Health Benefits</h3><ul><li>40% lower cardiovascular disease risk</li><li>30% reduction in type 2 diabetes</li><li>25% lower cancer risk</li><li>Improved cognitive function and longevity</li></ul><p>The diet emphasizes vegetables, fruits, whole grains, legumes, nuts, fish, and healthy fats like olive oil, while limiting red meat and processed foods.</p><p>Researchers note that the Mediterranean diet is not just about food - it includes regular physical activity and eating with family and friends.</p>',
      category_id: healthCat?.id,
      author_id: authors[2]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200',
      seo_title: 'Mediterranean Diet Cuts Disease Risk 40%: Major Study',
      seo_description: 'Comprehensive research shows Mediterranean eating dramatically reduces chronic disease risk.'
    },
    {
      title: 'SpaceX Announces Accelerated Mars Mission Timeline for 2028',
      slug: 'spacex-mars-mission-2028-timeline',
      excerpt: 'First crewed Mars mission moves closer as new Starship capabilities enable ambitious timeline.',
      content: '<h2>Journey to the Red Planet</h2><p>SpaceX has unveiled an ambitious timeline for the first crewed Mars mission, with new Starship capabilities making a 2028 landing feasible.</p><h3>Mission Timeline</h3><ul><li>2026: Initial cargo missions begin</li><li>2027: Test crew missions to lunar orbit</li><li>2028: First crewed Mars landing</li><li>2030: Sustainable Mars presence established</li></ul><p>NASA and international partners are collaborating on the historic mission, which will establish the first permanent human presence on another planet.</p><p>New life support systems, in-situ resource utilization, and advanced propulsion make the mission viable with current technology.</p>',
      category_id: techCat?.id,
      author_id: authors[1]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200',
      seo_title: 'SpaceX Plans Crewed Mars Mission for 2028',
      seo_description: 'SpaceX accelerates Mars mission timeline with new Starship capabilities and NASA partnership.'
    },
    {
      title: 'Electric Vehicles Hit 35% of Global New Car Sales',
      slug: 'electric-vehicle-sales-35-percent-2025',
      excerpt: 'EV adoption reaches tipping point as prices fall, range improves, and charging infrastructure expands globally.',
      content: '<h2>The EV Revolution Accelerates</h2><p>Electric vehicles now represent 35% of all new car sales globally, driven by falling prices, improved range, and rapidly expanding charging infrastructure.</p><h3>Market Trends</h3><ul><li>Average range now exceeds 500 miles</li><li>Price parity with gas vehicles achieved</li><li>300,000+ fast chargers worldwide</li><li>Battery costs down 80% since 2020</li></ul><p>Industry analysts predict EVs will reach 60% market share by 2027, with full dominance by 2030.</p><p>Major automakers have committed billions to EV production, with several announcing plans to phase out internal combustion engines entirely.</p>',
      category_id: techCat?.id,
      author_id: authors[1]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200',
      seo_title: 'Electric Vehicles Reach 35% of Global Car Sales',
      seo_description: 'EV adoption accelerates with falling prices and improved infrastructure.'
    },
    {
      title: 'Sustainable Fashion Industry Reaches $300 Billion Milestone',
      slug: 'sustainable-fashion-300-billion-2025',
      excerpt: 'Eco-friendly clothing moves from niche to mainstream as consumer demand for ethical fashion soars.',
      content: '<h2>Fashion Industry Transformation</h2><p>The sustainable fashion market has grown to $300 billion as consumers increasingly demand ethical and environmentally-friendly clothing options.</p><h3>Growth Drivers</h3><ul><li>Consumer sustainability awareness up 200%</li><li>Major brands committing to circular models</li><li>Transparent supply chain technologies</li><li>Innovative sustainable materials</li></ul><p>Industry leaders predict the sustainable fashion market will double to $600 billion by 2027.</p><p>New technologies like AI-powered supply chains and blockchain verification are making sustainable fashion more accessible and verifiable.</p>',
      category_id: envCat?.id,
      author_id: authors[4]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
      seo_title: 'Sustainable Fashion Hits $300B as Demand Soars',
      seo_description: 'Eco-friendly fashion moves mainstream with consumer demand driving industry transformation.'
    },
    {
      title: 'Olympic Athletes Achieve 15-23% Performance Boost Using AI Training',
      slug: 'olympic-ai-training-performance-boost-2025',
      excerpt: 'Cutting-edge artificial intelligence systems revolutionize athletic preparation for major competitions.',
      content: '<h2>AI Transforms Elite Sports Training</h2><p>Elite athletes preparing for the Olympics are using AI-powered training systems to optimize performance, achieving measurable 15-23% improvements.</p><h3>AI Training Technologies</h3><ul><li>Computer vision for real-time form analysis</li><li>Predictive injury prevention systems</li><li>Personalized nutrition optimization</li><li>Sleep quality monitoring and optimization</li></ul><p>National Olympic teams worldwide have adopted AI training as a core competitive strategy.</p><p>The technology analyzes millions of data points to identify micro-improvements that compound into significant performance gains.</p>',
      category_id: techCat?.id,
      author_id: authors[1]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200',
      seo_title: 'AI Training Boosts Olympic Performance 15-23%',
      seo_description: 'Elite athletes use AI-powered training systems for unprecedented performance gains.'
    }
  ];

  const createdArticles = [];

  for (const article of articles) {
    try {
      // Check if article already exists
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', article.slug)
        .single();

      if (existing) {
        console.log(`  ⏭️  Article "${article.title}" already exists`);
        continue;
      }

      const { data, error } = await supabase
        .from('articles')
        .insert(article)
        .select()
        .single();

      if (error) {
        handleError(`creating article "${article.title}"`, error);
        continue;
      }

      console.log(`  ✅ Created article: ${article.title}`);
      createdArticles.push(data);

      // Add tags to article
      const aiTag = tags.find(t => t.slug === 'ai');
      const innovationTag = tags.find(t => t.slug === 'innovation');
      const breakingTag = tags.find(t => t.slug === 'breaking-news');

      if (data && aiTag && innovationTag) {
        const articleTags = [];
        if (article.slug.includes('ai') || article.slug.includes('tech')) {
          articleTags.push(aiTag.id, innovationTag.id);
        }
        if (createdArticles.length <= 3) {
          articleTags.push(breakingTag?.id);
        }

        for (const tagId of articleTags.filter(Boolean)) {
          await supabase
            .from('article_tags')
            .insert({ article_id: data.id, tag_id: tagId })
            .select();
        }
      }

    } catch (error) {
      handleError(`creating article "${article.title}"`, error);
    }
  }

  console.log(`\n✅ Created ${createdArticles.length} articles\n`);
  return createdArticles;
}

// Main execution
async function main() {
  try {
    // Verify connection
    const { data: testConnection, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('❌ Failed to connect to Supabase. Please check your environment variables.');
      console.error('Error:', connectionError.message);
      process.exit(1);
    }

    console.log('✅ Connected to Supabase successfully\n');

    // Execute seeding steps
    const users = await createUsers();
    const authors = await createAuthors(users);
    const categories = await createCategories();
    const tags = await createTags();
    const articles = await createArticles(authors, categories, tags);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`  👥 Users: ${users.length}`);
    console.log(`  ✍️  Authors: ${authors.length}`);
    console.log(`  📁 Categories: ${categories.length}`);
    console.log(`  🏷️  Tags: ${tags.length}`);
    console.log(`  📰 Articles: ${articles.length}`);
    console.log('\n🔐 Admin Credentials:');
    console.log('  Email: admin@ekahnews.com');
    console.log('  Password: Admin@123456');
    console.log('\n🚀 You can now:');
    console.log('  1. Login at: ' + process.env.NEXT_PUBLIC_BASE_URL + '/login');
    console.log('  2. View articles at: ' + process.env.NEXT_PUBLIC_BASE_URL);
    console.log('  3. Access dashboard at: ' + process.env.NEXT_PUBLIC_BASE_URL + '/dashboard');
    console.log('\n✨ Happy publishing!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
main();

