-- ===================================
-- DUMMY DATA FOR NEWS CMS
-- ===================================
-- Run this after setting up your database schema

-- Note: You'll need to manually create users via signup first, then update their roles
-- Or use Supabase Auth API to create users programmatically

-- ===================================
-- 1. CATEGORIES
-- ===================================

INSERT INTO public.categories (name, slug, description) VALUES
('Technology', 'technology', 'Latest news and trends in technology, gadgets, and innovation'),
('Business', 'business', 'Business news, markets, economy, and entrepreneurship'),
('Sports', 'sports', 'Sports news, scores, and analysis from around the world'),
('Entertainment', 'entertainment', 'Movies, music, celebrities, and pop culture'),
('Science', 'science', 'Scientific discoveries, research, and breakthroughs'),
('Health', 'health', 'Health tips, medical news, and wellness advice'),
('Politics', 'politics', 'Political news, analysis, and current affairs'),
('Travel', 'travel', 'Travel guides, destinations, and adventure stories');

-- ===================================
-- 2. TAGS
-- ===================================

INSERT INTO public.tags (name, slug) VALUES
('AI', 'ai'),
('Machine Learning', 'machine-learning'),
('Cryptocurrency', 'cryptocurrency'),
('Startups', 'startups'),
('iOS', 'ios'),
('Android', 'android'),
('Web Development', 'web-development'),
('Cybersecurity', 'cybersecurity'),
('Climate Change', 'climate-change'),
('Space', 'space'),
('Medicine', 'medicine'),
('Fitness', 'fitness'),
('Nutrition', 'nutrition'),
('Football', 'football'),
('Basketball', 'basketball'),
('Olympics', 'olympics'),
('Movies', 'movies'),
('Music', 'music'),
('Gaming', 'gaming'),
('Election', 'election');

-- ===================================
-- 3. SAMPLE USERS & AUTHORS
-- ===================================

-- IMPORTANT: First, you need to create these users via Supabase Auth (signup page)
-- Then run the updates below to set their roles and create author profiles

-- Option 1: Create users via signup page at /signup, then run:

-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@EkahNews.com';
-- UPDATE public.users SET role = 'author' WHERE email = 'john.smith@EkahNews.com';
-- UPDATE public.users SET role = 'author' WHERE email = 'sarah.johnson@EkahNews.com';

-- After users exist, create author profiles:
-- (Replace the user_id UUIDs with actual UUIDs from your users table)

-- Example: Get user IDs first
-- SELECT id, email FROM auth.users;

-- Then insert authors (replace UUIDs):
/*
INSERT INTO public.authors (user_id, name, bio) VALUES
('USER_ID_1', 'Admin User', 'Chief Editor and Administrator of EkahNews'),
('USER_ID_2', 'John Smith', 'Technology journalist with 10+ years of experience covering AI, startups, and innovation'),
('USER_ID_3', 'Sarah Johnson', 'Senior reporter covering business, finance, and global markets');
*/

-- ===================================
-- 4. SAMPLE ARTICLES
-- ===================================

-- IMPORTANT: You need to have at least one author created first
-- Get the author_id from: SELECT id, name FROM public.authors;

-- Replace 'AUTHOR_ID_HERE' with actual author ID

-- Article 1: AI Technology
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content, 
  content_json,
  category_id, 
  author_id,
  status,
  seo_title,
  seo_description,
  published_at,
  featured_image_url
) VALUES (
  'Artificial Intelligence Revolutionizes Healthcare Diagnostics',
  'ai-revolutionizes-healthcare-diagnostics',
  'AI-powered diagnostic tools are showing unprecedented accuracy in detecting diseases, potentially saving millions of lives worldwide.',
  '<h2>The Future of Medical Diagnosis is Here</h2><p>Artificial intelligence is transforming the healthcare industry at an unprecedented pace. Recent studies show that AI diagnostic tools can now detect certain cancers with up to 95% accuracy, surpassing human doctors in some cases.</p><h3>Key Developments</h3><ul><li>AI systems can analyze medical images 100x faster than humans</li><li>Early detection rates have improved by 40% in pilot programs</li><li>Healthcare costs reduced by 30% through automated diagnostics</li></ul><p>Dr. Emily Chen, leading researcher at Stanford Medical Center, states: "We are witnessing a paradigm shift in how we approach medical diagnostics. AI is not replacing doctors, but empowering them to make better decisions faster."</p><h3>Real-World Impact</h3><p>Several hospitals across the United States have already implemented AI diagnostic systems. Mount Sinai Hospital in New York reported a 35% reduction in misdiagnosis rates after deploying their AI system.</p><blockquote>AI is not replacing doctors, but empowering them to make better decisions faster.</blockquote><p>The technology uses deep learning algorithms trained on millions of medical images to identify patterns that might be invisible to the human eye.</p>',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"The Future of Medical Diagnosis is Here"}]},{"type":"paragraph","content":[{"type":"text","text":"Artificial intelligence is transforming..."}]}]}',
  (SELECT id FROM public.categories WHERE slug = 'technology'),
  (SELECT id FROM public.authors LIMIT 1), -- Replace with actual author
  'published',
  'AI in Healthcare: Revolutionary Diagnostic Tools Save Lives',
  'Discover how artificial intelligence is transforming medical diagnostics with unprecedented accuracy, early detection, and cost savings.',
  NOW() - INTERVAL '2 days',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200'
);

-- Article 2: Business
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content,
  category_id, 
  author_id,
  status,
  seo_title,
  seo_description,
  published_at,
  featured_image_url
) VALUES (
  'Tech Startups See Record $120 Billion in Funding This Quarter',
  'tech-startups-record-funding-quarter',
  'Venture capital investments in technology startups reached historic highs as investors bet big on AI and clean tech innovations.',
  '<h2>Investment Boom in Tech Sector</h2><p>The technology startup ecosystem experienced unprecedented growth this quarter, with venture capital funding reaching $120 billion globally - a 45% increase from the previous quarter.</p><h3>Top Investment Areas</h3><ul><li>Artificial Intelligence: $45 billion</li><li>Clean Technology: $30 billion</li><li>FinTech: $25 billion</li><li>HealthTech: $20 billion</li></ul><p>Silicon Valley continues to dominate, but emerging tech hubs in Austin, Miami, and European cities are seeing significant growth.</p><h3>Notable Deals</h3><p>Several unicorns emerged this quarter, with AI startup "DeepMind Solutions" raising $2.5 billion at a $15 billion valuation. The company specializes in enterprise AI solutions and has partnerships with Fortune 500 companies.</p><p>Industry experts predict this trend will continue as companies race to adopt AI technologies before competitors.</p>',
  (SELECT id FROM public.categories WHERE slug = 'business'),
  (SELECT id FROM public.authors LIMIT 1),
  'published',
  'Record $120B Funding: Tech Startup Investment Boom Explained',
  'Tech startups secure record-breaking $120 billion in funding this quarter. See which sectors are attracting the most venture capital investment.',
  NOW() - INTERVAL '1 day',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200'
);

-- Article 3: Sports
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content,
  category_id, 
  author_id,
  status,
  seo_title,
  seo_description,
  published_at,
  featured_image_url
) VALUES (
  'Olympic Athletes Prepare for Paris 2024: Behind the Training',
  'olympic-athletes-paris-2024-training',
  'An exclusive look at how world-class athletes are preparing for the upcoming Paris 2024 Olympics with cutting-edge training methods.',
  '<h2>Road to Paris 2024</h2><p>With less than six months until the Paris 2024 Olympics, athletes around the world are in peak training mode. We got exclusive access to training facilities to see how modern technology is revolutionizing Olympic preparation.</p><h3>Technology Meets Athletics</h3><p>Today''s Olympic athletes use advanced tools:</p><ul><li>AI-powered performance analysis</li><li>Virtual reality training simulations</li><li>Biometric monitoring systems</li><li>Personalized nutrition plans based on DNA analysis</li></ul><p>Team USA swimmer Katie Morrison explains: "We have technology that can analyze every stroke, every breath, every movement. It''s like having a coach with superhuman vision."</p><h3>Training Facilities</h3><p>The U.S. Olympic Training Center in Colorado Springs has invested $50 million in new facilities, including altitude training chambers and biomechanics labs.</p><p>Athletes are training at simulated Paris conditions to adapt before competition day arrives.</p>',
  (SELECT id FROM public.categories WHERE slug = 'sports'),
  (SELECT id FROM public.authors LIMIT 1),
  'published',
  'Paris 2024 Olympics: How Athletes Train with Cutting-Edge Tech',
  'Go behind the scenes to see how Olympic athletes prepare for Paris 2024 using AI, VR, and advanced biometric technology.',
  NOW() - INTERVAL '3 hours',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200'
);

-- Article 4: Science
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content,
  category_id, 
  author_id,
  status,
  seo_title,
  seo_description,
  published_at,
  featured_image_url
) VALUES (
  'NASA Discovers Potentially Habitable Exoplanet 40 Light-Years Away',
  'nasa-discovers-habitable-exoplanet',
  'Scientists have identified a rocky planet in the habitable zone of a distant star system, raising exciting possibilities for extraterrestrial life.',
  '<h2>A New Hope in the Search for Life</h2><p>NASA''s James Webb Space Telescope has detected what could be one of the most promising candidates for hosting life beyond Earth. The exoplanet, designated Kepler-452c, orbits within the habitable zone of its star.</p><h3>Key Discoveries</h3><ul><li>Planet size: 1.4 times Earth''s radius</li><li>Surface temperature: Estimated 15-25°C (59-77°F)</li><li>Atmosphere detected: Contains water vapor</li><li>Distance: 40 light-years from Earth</li></ul><p>Dr. Sarah Martinez, lead astronomer on the project, stated: "This is the most Earth-like planet we''ve discovered outside our solar system. The presence of water vapor in the atmosphere is particularly exciting."</p><h3>What This Means</h3><p>While 40 light-years is far beyond current human space travel capabilities, this discovery provides crucial data about planet formation and the potential abundance of life-supporting worlds in our galaxy.</p><blockquote>This is the most Earth-like planet we''ve discovered outside our solar system.</blockquote><p>The research team plans to conduct further observations to determine if biosignatures are present in the planet''s atmosphere.</p>',
  (SELECT id FROM public.categories WHERE slug = 'science'),
  (SELECT id FROM public.authors LIMIT 1),
  'published',
  'NASA Finds Potentially Habitable Exoplanet: Kepler-452c Discovery',
  'NASA discovers Earth-like exoplanet with water vapor in habitable zone. Could this be humanity''s best chance to find extraterrestrial life?',
  NOW() - INTERVAL '5 hours',
  'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1200'
);

-- Article 5: Health
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content,
  category_id, 
  author_id,
  status,
  seo_title,
  seo_description,
  published_at,
  featured_image_url
) VALUES (
  'New Study Reveals Benefits of 15-Minute Daily Walks',
  'benefits-15-minute-daily-walks',
  'A groundbreaking study shows that just 15 minutes of walking per day can significantly reduce the risk of heart disease and improve mental health.',
  '<h2>Small Steps, Big Impact</h2><p>A comprehensive 10-year study involving 50,000 participants has revealed that a daily 15-minute walk can lead to remarkable health improvements, even for those with sedentary lifestyles.</p><h3>Key Findings</h3><ul><li>23% reduction in cardiovascular disease risk</li><li>18% lower rates of depression and anxiety</li><li>15% improvement in cognitive function</li><li>Better sleep quality in 67% of participants</li></ul><p>Dr. Michael Chen, the study''s lead researcher, explains: "We were surprised by how significant the benefits were from such a modest time commitment. You don''t need to run marathons to see real health improvements."</p><h3>Why It Works</h3><p>Regular walking, even for short periods, provides multiple benefits:</p><ul><li>Improves blood circulation</li><li>Boosts endorphin production</li><li>Reduces inflammation</li><li>Enhances insulin sensitivity</li></ul><p>The study also found that walking outdoors provided additional benefits compared to indoor walking, likely due to exposure to natural sunlight and fresh air.</p><h3>Getting Started</h3><p>Health experts recommend:</p><ul><li>Start with 5 minutes if you''re not active</li><li>Gradually increase to 15 minutes</li><li>Walk at a comfortable pace</li><li>Choose outdoor routes when possible</li></ul>',
  (SELECT id FROM public.categories WHERE slug = 'health'),
  (SELECT id FROM public.authors LIMIT 1),
  'published',
  '15-Minute Daily Walks: Proven Health Benefits & How to Start',
  'New study reveals 15-minute daily walks reduce heart disease by 23%, improve mental health, and boost cognitive function. Start walking today!',
  NOW() - INTERVAL '1 day',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200'
);

-- Article 6: Entertainment (Draft)
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content,
  category_id, 
  author_id,
  status,
  published_at,
  featured_image_url
) VALUES (
  'Summer Blockbuster Season Preview: Top 10 Must-See Movies',
  'summer-blockbuster-season-preview-2025',
  'Get ready for an epic summer of cinema with our exclusive preview of the most anticipated movies hitting theaters this year.',
  '<h2>The Biggest Movie Season Yet</h2><p>This summer promises to be one of the most exciting in cinema history, with major franchises returning and groundbreaking original films making their debut.</p><h3>Top Anticipated Releases</h3><p>Content being finalized...</p>',
  (SELECT id FROM public.categories WHERE slug = 'entertainment'),
  (SELECT id FROM public.authors LIMIT 1),
  'draft',
  NULL,
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200'
);

-- Article 7: Technology (Pending Review)
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content,
  category_id, 
  author_id,
  status,
  published_at,
  featured_image_url
) VALUES (
  'Quantum Computing Breakthrough: IBM Achieves 1000-Qubit Milestone',
  'quantum-computing-ibm-1000-qubit-milestone',
  'IBM''s latest quantum computer surpasses the 1000-qubit barrier, opening new possibilities for solving complex problems.',
  '<h2>A Quantum Leap Forward</h2><p>IBM has announced a major breakthrough in quantum computing, successfully building and testing a 1000-qubit quantum processor, named "Condor."</p><p>Article pending final review and fact-checking...</p>',
  (SELECT id FROM public.categories WHERE slug = 'technology'),
  (SELECT id FROM public.authors LIMIT 1),
  'pending',
  NULL,
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200'
);

-- Article 8: Travel
INSERT INTO public.articles (
  title, 
  slug, 
  excerpt, 
  content,
  category_id, 
  author_id,
  status,
  seo_title,
  seo_description,
  published_at,
  featured_image_url
) VALUES (
  'Top 10 Hidden Gems in Southeast Asia for 2025',
  'top-10-hidden-gems-southeast-asia-2025',
  'Discover breathtaking destinations in Southeast Asia that most tourists miss, from secret beaches to mountain villages.',
  '<h2>Beyond the Tourist Trail</h2><p>Southeast Asia offers countless incredible destinations beyond the usual hotspots. Here are 10 hidden gems that offer authentic experiences without the crowds.</p><h3>1. Koh Rong Sanloem, Cambodia</h3><p>This small island near Sihanoukville boasts pristine beaches, bioluminescent plankton, and incredible snorkeling. Unlike its busier neighbor Koh Rong, Sanloem remains peaceful and undeveloped.</p><h3>2. Luang Namtha, Laos</h3><p>A paradise for eco-tourists, this northern province offers jungle trekking, ethnic village homestays, and stunning mountain scenery.</p><h3>3. Hpa-An, Myanmar</h3><p>Known for its dramatic limestone karsts, caves filled with Buddha statues, and rural charm, Hpa-An is Myanmar''s best-kept secret.</p><h3>Best Time to Visit</h3><p>November to March offers the best weather across most of Southeast Asia, with clear skies and comfortable temperatures.</p><h3>Travel Tips</h3><ul><li>Learn basic local phrases</li><li>Respect local customs and dress codes</li><li>Support local businesses</li><li>Travel during shoulder season for better prices</li></ul>',
  (SELECT id FROM public.categories WHERE slug = 'travel'),
  (SELECT id FROM public.authors LIMIT 1),
  'published',
  'Hidden Gems Southeast Asia 2025: 10 Secret Destinations',
  'Explore 10 undiscovered destinations in Southeast Asia. Secret beaches, mountain villages, and authentic experiences await in 2025.',
  NOW() - INTERVAL '6 hours',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200'
);

-- ===================================
-- 5. LINK ARTICLES TO TAGS
-- ===================================

-- Get article and tag IDs and create relationships
-- Article 1 (AI Healthcare) -> AI, Machine Learning, Medicine
INSERT INTO public.article_tags (article_id, tag_id)
SELECT 
  (SELECT id FROM public.articles WHERE slug = 'ai-revolutionizes-healthcare-diagnostics'),
  id
FROM public.tags
WHERE slug IN ('ai', 'machine-learning', 'medicine');

-- Article 2 (Startup Funding) -> Startups, AI, Cryptocurrency
INSERT INTO public.article_tags (article_id, tag_id)
SELECT 
  (SELECT id FROM public.articles WHERE slug = 'tech-startups-record-funding-quarter'),
  id
FROM public.tags
WHERE slug IN ('startups', 'ai', 'cryptocurrency');

-- Article 3 (Olympics) -> Olympics, Fitness
INSERT INTO public.article_tags (article_id, tag_id)
SELECT 
  (SELECT id FROM public.articles WHERE slug = 'olympic-athletes-paris-2024-training'),
  id
FROM public.tags
WHERE slug IN ('olympics', 'fitness');

-- Article 4 (Exoplanet) -> Space, Science
INSERT INTO public.article_tags (article_id, tag_id)
SELECT 
  (SELECT id FROM public.articles WHERE slug = 'nasa-discovers-habitable-exoplanet'),
  id
FROM public.tags
WHERE slug IN ('space');

-- Article 5 (Walking) -> Health, Fitness, Nutrition
INSERT INTO public.article_tags (article_id, tag_id)
SELECT 
  (SELECT id FROM public.articles WHERE slug = 'benefits-15-minute-daily-walks'),
  id
FROM public.tags
WHERE slug IN ('fitness', 'nutrition');

-- Article 8 (Travel) -> No tech tags needed

-- ===================================
-- VERIFICATION QUERIES
-- ===================================

-- Check what was created:
-- SELECT COUNT(*) as category_count FROM public.categories;
-- SELECT COUNT(*) as tag_count FROM public.tags;
-- SELECT COUNT(*) as article_count FROM public.articles;
-- SELECT status, COUNT(*) FROM public.articles GROUP BY status;

-- View articles with categories:
-- SELECT a.title, a.status, c.name as category, a.published_at 
-- FROM public.articles a 
-- LEFT JOIN public.categories c ON a.category_id = c.id 
-- ORDER BY a.created_at DESC;

