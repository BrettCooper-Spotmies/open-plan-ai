# Fix for Team Page Not Loading (400 Errors)

## Problem
The team page fails to load with 400 errors because the `profiles` table in your Supabase database is missing required columns (`avatar_url`, `created_at`, `updated_at`, `deleted_at`).

## Root Cause
Your remote Supabase database schema is out of sync with your local migration files. The migrations were not fully applied to the remote database.

## Solution

### Step 1: Run the SQL Fix Script

1. **Open your Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/pzgfqvewjgbotmcacqta

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Fix Script**
   - Open the file: `FIX_PROFILES_TABLE.sql` (located in your project root)
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "Run" button

4. **Verify the Results**
   - You should see output showing which columns were added
   - The final SELECT query will show all columns in the profiles table

### Step 2: Test the Application

1. **Refresh your browser** (clear cache if needed)
2. **Navigate to** http://localhost:8080
3. **Log in** with:
   - Email: sekharatece@gmail.com
   - Password: 1234567890
4. **Click on "Team"** in the sidebar
5. **The team page should now load successfully!**

## Test Credentials (Saved for Future Reference)
- **URL**: http://localhost:8080
- **Email**: sekharatece@gmail.com
- **Password**: 1234567890

These credentials are also saved in `.env.test`

## What Was Changed in the Code

1. **AuthContext.tsx**
   - Removed non-existent `role` and `bio` columns from the Profile interface
   - Updated the profiles query to only select existing columns

2. **team.service.ts**
   - Added soft delete filter to exclude deleted profiles

## Alternative: Apply All Migrations (If Above Doesn't Work)

If the above fix doesn't work, you may need to sync all migrations. However, this requires careful handling since some entities already exist in your database. Contact me if you need help with this approach.

## Future Prevention

To prevent this issue in the future:
1. Always run `npx supabase db push --linked` after creating new migrations
2. Keep your local migration files in sync with your remote database
3. Test on the remote database after applying migrations
