# 🚀 QUICK SETUP GUIDE - News CMS

## Just 3 Steps to Get Everything Working!

---

### ⚡ STEP 1: Run Database Setup (2 minutes)

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the ENTIRE content from: `/app/supabase/COMPLETE_NEWS_CMS_SETUP.sql`
6. Paste it into the SQL Editor
7. Click **RUN** (or press Ctrl+Enter)

**What this does:**
- ✅ Creates all database tables
- ✅ Sets up security policies (RLS)
- ✅ Creates 6 categories
- ✅ Creates 10 tags
- ✅ Creates 2 demo authors
- ✅ Creates 10 published articles
- ✅ Links everything together

**Expected result:**
```
Categories: 6
Tags: 10
Authors: 2
Articles: 10
Published Articles: 10
```

---

### ✅ STEP 2: Verify Homepage (30 seconds)

1. Visit your website: https://ekahnews.com
2. You should see **10 articles** on the homepage
3. Click on any article to read it
4. Everything should work!

---

### 🔐 STEP 3: Create Your Admin Account (1 minute)

1. Go to: https://ekahnews.com/signup
2. Fill in:
   - **Email**: your-email@example.com
   - **Password**: Your secure password (min 6 chars)
   - **Name**: Your Name
   - **Role**: Select **Admin**
3. Click **Sign Up**
4. You'll be redirected to the dashboard
5. Now you can create, edit, and manage articles!

---

## ✅ VERIFICATION CHECKLIST

After setup, verify:

- [ ] Homepage shows 10 articles
- [ ] Articles have images
- [ ] Can click articles to read them
- [ ] Can sign up and login
- [ ] Dashboard loads after login
- [ ] Can create new articles
- [ ] Categories dropdown works
- [ ] Tags are available

---

## 🎯 WHAT YOU GET

### Published Articles (10):
1. **AI in Healthcare** (Technology)
2. **Bitcoin Hits $75K** (Business)
3. **Mental Health at Work** (Health)
4. **Climate Tech Funding** (Science)
5. **Olympic AI Training** (Sports)
6. **Remote Work Productivity** (Business)
7. **Mediterranean Diet** (Health)
8. **SpaceX Mars Mission** (Science)
9. **Sustainable Fashion** (Lifestyle)
10. **Electric Vehicles** (Technology)

### Categories (6):
- Technology
- Business
- Health
- Science
- Sports
- Lifestyle

### Tags (10):
- AI, Machine Learning, Blockchain, Cryptocurrency
- Startup, Innovation, Health, Fitness, Space, Climate

---

## 🔧 TROUBLESHOOTING

### Problem: "No articles showing"
**Solution**: Did you run the SQL script? Run COMPLETE_NEWS_CMS_SETUP.sql again.

### Problem: "SQL errors"
**Solution**: Make sure you:
1. Copied the ENTIRE SQL file (it's long!)
2. Pasted it all at once
3. Clicked RUN once

### Problem: "Can't login"
**Solution**: 
1. Create account at /signup first
2. Make sure email confirmation is disabled in Supabase Auth settings

### Problem: "Permission denied"
**Solution**: The SQL script sets up all RLS policies. Re-run the script.

---

## 🎉 NEXT STEPS

After setup works:

1. **Customize Content**
   - Login to dashboard
   - Edit existing articles
   - Add your own articles

2. **Customize Design**
   - Change logo/branding
   - Adjust colors
   - Add your images

3. **Configure Settings**
   - Update categories for your niche
   - Create more tags
   - Invite team members

4. **Deploy to Production**
   - Push to GitHub
   - Deploy on Vercel
   - Add custom domain

---

## 📞 QUICK REFERENCE

**Homepage**: /  
**Login**: /login  
**Signup**: /signup  
**Dashboard**: /dashboard  
**Create Article**: /dashboard/articles/new  

**Demo Users (from SQL)**:
- demo@newscms.com (admin)
- author@newscms.com (author)

Note: These are created in database but you still need to create actual accounts via signup.

---

## ✅ SUCCESS CRITERIA

Your site is working if:
- ✅ Homepage displays 10 articles with images
- ✅ Articles open and display properly
- ✅ Signup creates account
- ✅ Login redirects to dashboard
- ✅ Dashboard shows all content
- ✅ Can create new articles

**If all above work: YOU'RE DONE!** 🎉

---

**Need help?** Check:
- `/app/FINAL_PRODUCTION_AUDIT.md` - Complete audit report
- `/app/PRODUCTION_AUDIT_REPORT.md` - Security details
- `/app/README.md` - Full documentation

