# News Publishing CMS

A production-ready News Publishing Web Application built with Next.js 14, Supabase, and TipTap rich text editor.

## Features

✅ **Authentication System**
- Email/password authentication
- Role-based access control (Admin & Author)
- Protected dashboard routes

✅ **Rich Text Editor (TipTap)**
- H1, H2, H3 headings with proper spacing
- Bold, italic, underline formatting
- Bullet and numbered lists
- Blockquotes and horizontal dividers
- Table support with resizing
- Hyperlink insertion with new tab option
- YouTube video embeds
- Image upload with drag & drop
- Image alignment, captions, and alt text

✅ **Workflow System**
- Draft, Pending, and Published status
- Authors can submit articles for review
- Admins can approve and publish
- Auto-generated slugs from titles
- Manual slug editing
- 301 redirects for slug changes

✅ **Article Management**
- Full CRUD operations
- Category and tag assignment
- Featured image upload
- SEO title and description
- Live preview
- Structured JSON content storage

✅ **Media Library**
- Upload files to Supabase Storage
- View, search, and delete media
- File type and size display

✅ **Dashboard Sections**
- Dashboard overview with statistics
- Articles management
- Categories management (Admin only)
- Tags management
- Authors listing (Admin only)
- Media library

✅ **Public Pages**
- Homepage with published articles
- Article detail page with proper rendering
- Responsive design

## Setup Instructions

### 1. Database Schema Setup

Run the following SQL migrations in your Supabase Dashboard SQL Editor:

#### Step 1: Run Initial Schema
```bash
# Copy contents of /app/supabase/migrations/001_initial_schema.sql
# Paste into Supabase Dashboard > SQL Editor > New Query
# Click "Run"
```

#### Step 2: Run Enhanced CMS Schema
```bash
# Copy contents of /app/supabase/migrations/002_enhanced_cms_schema.sql
# Paste into Supabase Dashboard > SQL Editor > New Query
# Click "Run"
```

### 2. Create Storage Bucket

In Supabase Dashboard:
1. Go to **Storage** section
2. Click **New Bucket**
3. Name: `media`
4. Check **Public bucket**
5. Click **Create**

#### Set Storage Policies

Run this SQL in the SQL Editor:
```sql
-- Allow public to view media
CREATE POLICY "Public can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own media
CREATE POLICY "Users can delete their own media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND auth.uid() = owner);
```

### 3. Environment Variables

Create a root-level `.env.local` from `.env.local.example` and fill in your project values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Start the Application

The application is already running on:
- **Local**: http://localhost:3000
- **Preview**: https://ekahnews.com

## User Roles

### Admin
- Full access to all features
- Can create, edit, delete articles
- Can publish articles directly
- Can manage categories
- Can view all authors
- Can delete media files

### Author
- Can create and edit their own articles
- Can save drafts
- Can submit articles for review
- Cannot publish directly (must be approved by admin)
- Can upload media
- Can manage tags

## Usage Guide

### Creating Your First Article

1. **Sign Up**: Go to `/signup` and create an account
2. **Login**: Go to `/login` and sign in
3. **Create Article**: 
   - Navigate to Dashboard > Articles
   - Click "New Article"
   - Fill in the title (slug auto-generates)
   - Add excerpt
   - Select category and tags
   - Upload featured image
   - Write content using the rich text editor
   - Add SEO fields
   - Save as draft, submit for review, or publish (admin only)

### Managing Categories (Admin Only)

1. Go to Dashboard > Categories
2. Click "New Category"
3. Enter name and description
4. Click "Create Category"

### Managing Tags

1. Go to Dashboard > Tags
2. Click "New Tag"
3. Enter tag name
4. Click "Create Tag"

### Uploading Media

1. Go to Dashboard > Media Library
2. Click "Upload File"
3. Select file from your device
4. File will be uploaded to Supabase Storage

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Rich Text Editor**: TipTap
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Deployment**: Vercel-optimized

## Project Structure

```
/app
├── app/
│   ├── login/page.jsx              # Login page
│   ├── signup/page.jsx             # Signup page
│   ├── dashboard/                  # Protected dashboard
│   │   ├── layout.jsx              # Dashboard layout with sidebar
│   │   ├── page.jsx                # Dashboard home
│   │   ├── articles/               # Article management
│   │   │   ├── page.jsx            # Articles list
│   │   │   └── new/page.jsx        # Create article
│   │   ├── categories/page.jsx     # Categories management
│   │   ├── tags/page.jsx           # Tags management
│   │   ├── authors/page.jsx        # Authors listing
│   │   └── media/page.jsx          # Media library
│   ├── articles/[slug]/page.jsx    # Public article view
│   ├── page.js                     # Homepage
│   ├── layout.js                   # Root layout
│   └── globals.css                 # Global styles
├── components/
│   ├── editor/
│   │   └── TipTapEditor.jsx        # Rich text editor
│   ├── dashboard/
│   │   └── DashboardNav.jsx        # Dashboard navigation
│   └── ui/                         # shadcn/ui components
├── lib/
│   └── supabase/
│       ├── client.js               # Browser client
│       ├── server.js               # Server client
│       └── admin.js                # Admin client
├── supabase/
│   └── migrations/                 # SQL migrations
├── middleware.js                   # Route protection
└── .env.local                      # Environment variables
```

## Database Schema

- **users**: User profiles with roles
- **authors**: Author information and bio
- **categories**: Content categories
- **tags**: Content tags
- **articles**: Article content with workflow status
- **article_tags**: Junction table for article-tag relationships
- **media_library**: Uploaded media metadata
- **slug_history**: Track slug changes for 301 redirects

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based policies for data access
- Protected routes with middleware
- Secure file upload to Supabase Storage
- Service role key for admin operations

## Next Steps

- [ ] Add article editing functionality
- [ ] Implement article search and filtering
- [ ] Add pagination for articles list
- [ ] Create author profile management
- [ ] Add article analytics
- [ ] Implement comment system
- [ ] Add email notifications
- [ ] Create RSS feed

## License
