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

console.log('🚀 Starting News CMS Database Seeding (Fixed Version)...\n');

// Helper function to handle errors
function handleError(operation, error) {
  console.error(`❌ Error during ${operation}:`);
  console.error('  Message:', error.message);
  if (error.details) console.error('  Details:', error.details);
  if (error.hint) console.error('  Hint:', error.hint);
  if (error.code) console.error('  Code:', error.code);
}

// Step 1: Create Users via Supabase Auth AND manually insert into public.users
async function createUsers() {
  console.log('📝 Step 1: Creating users...');

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
      bio: 'Senior Technology Correspondent with 10 years of experience.'
    },
    {
      email: 'sarah.johnson@ekahnews.com',
      password: 'Author@123456',
      role: 'author',
      name: 'Sarah Johnson',
      bio: 'Health and Wellness Reporter specializing in nutrition.'
    },
    {
      email: 'michael.chen@ekahnews.com',
      password: 'Author@123456',
      role: 'author',
      name: 'Michael Chen',
      bio: 'Business and Finance Journalist covering markets.'
    },
    {
      email: 'emma.williams@ekahnews.com',
      password: 'Author@123456',
      role: 'author',
      name: 'Emma Williams',
      bio: 'Climate and Environmental Reporter.'
    }
  ];

  const createdUsers = [];

  for (const userData of usersToCreate) {
    try {
      // Check if user already exists in auth
      const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
      const authUserExists = existingAuthUsers?.users?.some(u => u.email === userData.email);

      let userId;

      if (authUserExists) {
        console.log(`  ⏭️  Auth user ${userData.email} exists`);
        const existingAuthUser = existingAuthUsers.users.find(u => u.email === userData.email);
        userId = existingAuthUser.id;
      } else {
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
          // If trigger is broken, we can still continue if the auth user was created
          console.log(`  ⚠️  Warning creating auth user ${userData.email}:`, authError.message);

          // Check if user was created despite error
          const { data: checkUsers } = await supabase.auth.admin.listUsers();
          const createdUser = checkUsers?.users?.find(u => u.email === userData.email);

          if (createdUser) {
            console.log(`  ✅ Auth user ${userData.email} was created (${createdUser.id})`);
            userId = createdUser.id;
          } else {
            console.log(`  ❌ Skipping ${userData.email} - could not create`);
            continue;
          }
        } else {
          console.log(`  ✅ Created auth user: ${userData.email} (${authUser.user.id})`);
          userId = authUser.user.id;
        }
      }

      // Check if user exists in public.users
      const { data: existingPublicUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingPublicUser) {
        // Manually insert into public.users (in case trigger failed)
        const { error: userInsertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: userData.email,
            role: userData.role
          });

        if (userInsertError && userInsertError.code !== '23505') {
          console.log(`  ⚠️  Could not insert ${userData.email} into public.users:`, userInsertError.message);
        } else {
          console.log(`  ✅ Added ${userData.email} to public.users`);
        }
      } else {
        console.log(`  ✅ ${userData.email} already in public.users`);
      }

      createdUsers.push({
        id: userId,
        email: userData.email,
        role: userData.role,
        name: userData.name,
        bio: userData.bio
      });

    } catch (error) {
      console.error(`  ❌ Fatal error with ${userData.email}:`, error.message);
    }
  }

  console.log(`\n✅ Processed ${createdUsers.length} users\n`);
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
        .select('id, user_id, name')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        console.log(`  ⏭️  Author for ${user.email} exists`);
        authors.push(existing);
        continue;
      }

      const { data, error } = await supabase
        .from('authors')
        .insert({
          user_id: user.id,
          name: user.name,
          bio: user.bio,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
        })
        .select()
        .single();

      if (error) {
        handleError(`creating author for ${user.email}`, error);
        continue;
      }

      console.log(`  ✅ Created author: ${user.name}`);
      authors.push(data);
    } catch (error) {
      handleError(`creating author for ${user.email}`, error);
    }
  }

  console.log(`\n✅ Created ${authors.length} authors\n`);
  return authors;
}

// Step 3: Create Categories (without description field)
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
      // Try to get existing first
      const { data: existing } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', category.slug)
        .single();

      if (existing) {
        console.log(`  ⏭️  Category ${category.name} exists`);
        createdCategories.push(existing);
        continue;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

      if (error) {
        handleError(`creating category ${category.name}`, error);
        continue;
      }

      console.log(`  ✅ Created category: ${category.name}`);
      createdCategories.push(data);
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
      const { data: existing } = await supabase
        .from('tags')
        .select('*')
        .eq('slug', tag.slug)
        .single();

      if (existing) {
        createdTags.push(existing);
        continue;
      }

      const { data, error } = await supabase
        .from('tags')
        .insert(tag)
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

// Step 5: Create Articles (matching actual schema)
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

  // Check what fields articles table actually has
  const { data: sampleArticle } = await supabase
    .from('articles')
    .select('*')
    .limit(1);

  console.log('  ℹ️  Articles table sample:', sampleArticle ? Object.keys(sampleArticle[0] || {}) : 'empty');

  const articles = [
    {
      title: 'AI Revolutionizes Healthcare Diagnostics in 2025',
      slug: 'ai-revolutionizes-healthcare-2025',
      excerpt: 'AI systems detecting diseases with 98% accuracy, transforming medicine.',
      content: '<h2>The Future of Medicine</h2><p>Artificial intelligence is transforming healthcare with unprecedented diagnostic accuracy.</p><h3>Key Benefits</h3><ul><li>98% diagnostic accuracy</li><li>40% faster diagnosis</li><li>35% fewer errors</li></ul>',
      category_id: techCat?.id,
      author_id: authors[Math.min(1, authors.length - 1)]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200'
    },
    {
      title: 'Bitcoin Surpasses $75,000 as Institutions Invest',
      slug: 'bitcoin-surpasses-75000-2025',
      excerpt: 'Cryptocurrency reaches new highs driven by institutional adoption.',
      content: '<h2>Crypto Market Surge</h2><p>Bitcoin has broken through the $75,000 barrier.</p><h3>Market Data</h3><ul><li>Bitcoin: $75,432 (+127% YoY)</li><li>Market cap: $3.2 trillion</li></ul>',
      category_id: businessCat?.id,
      author_id: authors[Math.min(2, authors.length - 1)]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200'
    },
    {
      title: '15-Minute Daily Walks Reduce Heart Disease Risk',
      slug: 'daily-walks-reduce-heart-disease-2025',
      excerpt: 'Research shows minimal exercise has major health benefits.',
      content: '<h2>Simple Exercise, Big Results</h2><p>Just 15 minutes of walking per day significantly reduces cardiovascular disease risk.</p>',
      category_id: healthCat?.id,
      author_id: authors[Math.min(3, authors.length - 1)]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200'
    },
    {
      title: 'Climate Tech Startups Raise Record $50 Billion',
      slug: 'climate-tech-funding-50-billion-2024',
      excerpt: 'Investment in climate technology reaches unprecedented levels.',
      content: '<h2>Climate Tech Boom</h2><p>Climate technology startups raised $50 billion in 2024.</p>',
      category_id: envCat?.id,
      author_id: authors[Math.min(4, authors.length - 1)]?.id || authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=1200'
    },
    {
      title: 'Remote Work Productivity Increases 13%',
      slug: 'remote-work-productivity-increase-2025',
      excerpt: 'Analysis reveals secrets of successful remote work.',
      content: '<h2>Remote Work Success</h2><p>Productivity increases by 13% when remote work is implemented correctly.</p>',
      category_id: businessCat?.id,
      author_id: authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200'
    },
    {
      title: 'Mediterranean Diet Lowers Disease Risk 40%',
      slug: 'mediterranean-diet-health-benefits-2025',
      excerpt: 'Largest nutrition study reveals dramatic health benefits.',
      content: '<h2>Diet and Health</h2><p>Mediterranean diet reduces chronic disease risk by up to 40%.</p>',
      category_id: healthCat?.id,
      author_id: authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200'
    },
    {
      title: 'SpaceX Announces Mars Mission for 2028',
      slug: 'spacex-mars-mission-2028-timeline',
      excerpt: 'First crewed Mars mission moves closer with new capabilities.',
      content: '<h2>Journey to Mars</h2><p>SpaceX has unveiled timeline for first crewed Mars mission.</p>',
      category_id: techCat?.id,
      author_id: authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200'
    },
    {
      title: 'Electric Vehicles Hit 35% of Global Sales',
      slug: 'electric-vehicle-sales-35-percent-2025',
      excerpt: 'EV adoption reaches tipping point worldwide.',
      content: '<h2>EV Revolution</h2><p>Electric vehicles now represent 35% of all new car sales globally.</p>',
      category_id: techCat?.id,
      author_id: authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200'
    },
    {
      title: 'Sustainable Fashion Reaches $300 Billion',
      slug: 'sustainable-fashion-300-billion-2025',
      excerpt: 'Eco-friendly clothing moves from niche to mainstream.',
      content: '<h2>Fashion Revolution</h2><p>Sustainable fashion market has grown to $300 billion.</p>',
      category_id: envCat?.id,
      author_id: authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200'
    },
    {
      title: 'Olympic Athletes Use AI Training for 23% Boost',
      slug: 'olympic-ai-training-performance-boost-2025',
      excerpt: 'AI systems revolutionize athletic preparation.',
      content: '<h2>AI in Sports</h2><p>Elite athletes using AI achieve 15-23% performance improvements.</p>',
      category_id: techCat?.id,
      author_id: authors[0]?.id,
      status: 'published',
      published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      featured_image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200'
    }
  ];

  const createdArticles = [];

  for (const article of articles) {
    try {
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', article.slug)
        .single();

      if (existing) {
        console.log(`  ⏭️  Article "${article.title.substring(0, 50)}..." exists`);
        continue;
      }

      const { data, error } = await supabase
        .from('articles')
        .insert(article)
        .select()
        .single();

      if (error) {
        handleError(`creating article "${article.title.substring(0, 50)}..."`, error);
        continue;
      }

      console.log(`  ✅ Created: ${article.title.substring(0, 60)}...`);
      createdArticles.push(data);

    } catch (error) {
      handleError(`creating article "${article.title.substring(0, 50)}..."`, error);
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

    if (connectionError && connectionError.code !== 'PGRST116') {
      console.error('❌ Failed to connect to Supabase.');
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
    console.log('🎉 DATABASE SEEDING COMPLETED!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`  👥 Users: ${users.length}`);
    console.log(`  ✍️  Authors: ${authors.length}`);
    console.log(`  📁 Categories: ${categories.length}`);
    console.log(`  🏷️  Tags: ${tags.length}`);
    console.log(`  📰 Articles: ${articles.length}`);

    if (users.length > 0) {
      console.log('\n🔐 Admin Credentials:');
      console.log('  Email: admin@ekahnews.com');
      console.log('  Password: Admin@123456');
    }

    console.log('\n🚀 Next steps:');
    console.log('  1. Login at: ' + process.env.NEXT_PUBLIC_BASE_URL + '/login');
    console.log('  2. View articles at: ' + process.env.NEXT_PUBLIC_BASE_URL);
    console.log('  3. Access dashboard at: ' + process.env.NEXT_PUBLIC_BASE_URL + '/dashboard');
    console.log('\n✨ Done!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error.message);
    process.exit(1);
  }
}

// Run the seeding
main();

