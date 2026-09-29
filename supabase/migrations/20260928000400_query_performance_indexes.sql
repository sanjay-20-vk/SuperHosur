-- Database Composite Indexing & Query Hardening Migration
-- Phase 17 Step 4: Optimized composite indexes, missing foreign key indexes, and partial indexes
-- strictly tailored to SuperHosur's application query access patterns.

-- ============================================================================
-- 1. BUSINESSES TABLE
-- ============================================================================

-- Supports public marketplace search and category/city browse with created_at ordering
-- Query: businesses.select(...).eq('active', true).eq('verified', true).eq('category_id', ...).eq('city_id', ...).order('created_at', desc)
create index if not exists businesses_public_filter_sort_idx
  on public.businesses (category_id, city_id, created_at desc)
  where active = true and verified = true;

-- Supports public marketplace search default name ordering
-- Query: businesses.select(...).eq('active', true).eq('verified', true).order('name', asc)
create index if not exists businesses_public_name_sort_idx
  on public.businesses (category_id, city_id, name)
  where active = true and verified = true;

-- Supports owner dashboard and owner listing queries
-- Query: businesses.select('*').eq('owner_id', userId).order('created_at', desc)
create index if not exists businesses_owner_created_idx
  on public.businesses (owner_id, created_at desc);

-- Supports admin oversight queue sorting
-- Query: businesses.select('*').order('verified', asc).order('created_at', desc)
create index if not exists businesses_admin_review_idx
  on public.businesses (verified, created_at desc);

-- ============================================================================
-- 2. PROPERTIES TABLE
-- ============================================================================

-- Supports public property browse with location, listing type, and property type filters
-- Query: properties.select(...).eq('active', true).eq('verified', true).eq('city_id', ...).eq('listing_type', ...).eq('property_type', ...).order('created_at', desc)
create index if not exists properties_public_browse_idx
  on public.properties (city_id, listing_type, property_type, created_at desc)
  where active = true and verified = true;

-- Supports owner property management queries
-- Query: properties.select(...).eq('owner_id', ownerId).order('created_at', desc)
create index if not exists properties_owner_created_idx
  on public.properties (owner_id, created_at desc);

-- ============================================================================
-- 3. REQUIREMENTS TABLE
-- ============================================================================

-- Supports customer requirements dashboard
-- Query: requirements.select(...).eq('customer_id', userId).order('created_at', desc)
create index if not exists requirements_customer_created_idx
  on public.requirements (customer_id, created_at desc);

-- Supports automated business-to-requirement matching triggers and vendor lead discovery
-- Query: requirements.select(...).eq('city_id', ...).eq('category_id', ...).in('status', ['open', 'matching']).order('created_at', desc)
create index if not exists requirements_matching_idx
  on public.requirements (status, category_id, city_id, created_at desc);

-- ============================================================================
-- 4. REQUIREMENT QUOTATIONS & MATCHES
-- ============================================================================

-- Foreign key index on vendor_id (references profiles.id) for cascade performance and vendor lookups
create index if not exists requirement_quotes_vendor_id_idx
  on public.requirement_quotes (vendor_id);

-- Supports customer requirement quotation review in chronological order
-- Query: requirement_quotes.select(...).eq('requirement_id', rId).order('created_at', asc)
create index if not exists requirement_quotes_req_created_idx
  on public.requirement_quotes (requirement_id, created_at asc);

-- Supports vendor quote lookups and lead status aggregation
-- Query: requirement_quotes.select(...).eq('business_id', bId).order('created_at', desc)
create index if not exists requirement_quotes_business_created_idx
  on public.requirement_quotes (business_id, created_at desc);

-- Supports vendor lead feed sorted by match recency
-- Query: requirement_matches.select(...).order('created_at', desc) scoped by owns_business(business_id)
create index if not exists requirement_matches_business_created_idx
  on public.requirement_matches (business_id, created_at desc);

-- ============================================================================
-- 5. REQUIREMENT MESSAGES (DISCUSSIONS)
-- ============================================================================

-- Foreign key index on sender_id (references profiles.id) for cascade performance
create index if not exists requirement_messages_sender_id_idx
  on public.requirement_messages (sender_id);

-- Supports in-app discussion message thread loading in chronological order
-- Query: requirement_messages.select(...).eq('requirement_id', rId).eq('quote_id', qId).order('created_at', asc)
create index if not exists requirement_messages_thread_idx
  on public.requirement_messages (requirement_id, quote_id, created_at asc);

-- ============================================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================================

-- Supports user notification feed pagination
-- Query: notifications.select('*').eq('user_id', userId).order('created_at', desc).limit(...)
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Supports unread notification badge counter and unread notification filter
-- Query: notifications.select('*').eq('user_id', userId).eq('is_read', false).order('created_at', desc)
create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, created_at desc)
  where is_read = false;

-- ============================================================================
-- 7. SAVED LISTINGS / FAVORITES
-- ============================================================================

-- Supports user saved listings page sorted by save date
-- Query: saved_listings.select(...).eq('user_id', userId).order('created_at', desc)
create index if not exists saved_listings_user_created_idx
  on public.saved_listings (user_id, created_at desc);

-- ============================================================================
-- 8. LISTING ANALYTICS EVENTS
-- ============================================================================

-- Foreign key index on user_id (references profiles.id) for telemetry audit and FK cascades
-- (business_id, created_at desc) and (property_id, created_at desc) are already indexed from Step 2
create index if not exists listing_analytics_user_id_idx
  on public.listing_analytics_events (user_id)
  where user_id is not null;

-- ============================================================================
-- 9. CUSTOMER REVIEWS
-- ============================================================================

-- Supports approved review feed display on business detail pages
-- Query: business_reviews.select(...).eq('business_id', bId).eq('moderation_status', 'approved').order('created_at', desc)
create index if not exists business_reviews_approved_created_idx
  on public.business_reviews (business_id, created_at desc)
  where moderation_status = 'approved';

-- ============================================================================
-- 10. CATALOG SUPPLY: SERVICES & PRODUCTS
-- ============================================================================

-- Supports business detail service tab listing sorted by recency
-- Query: business_services.select(...).eq('business_id', bId).order('created_at', desc)
create index if not exists business_services_biz_created_idx
  on public.business_services (business_id, created_at desc);

-- Supports business detail product tab listing sorted by recency
-- Query: business_products.select(...).eq('business_id', bId).order('created_at', desc)
create index if not exists business_products_biz_created_idx
  on public.business_products (business_id, created_at desc);

-- Supports automated requirement matching triggers and subcategory catalog filtering
-- Query: business_services.select(...).eq('subcategory_id', ...).eq('active', true)
create index if not exists business_services_subcategory_idx
  on public.business_services (subcategory_id)
  where active = true;

-- Query: business_products.select(...).eq('subcategory_id', ...).eq('active', true)
create index if not exists business_products_subcategory_idx
  on public.business_products (subcategory_id)
  where active = true;

-- ============================================================================
-- 11. MODERATED MEDIA: PHOTOS & VIDEOS
-- ============================================================================

-- Supports approved cover photo attachment and public business gallery loading
-- Query: business_photos.select(...).in('business_id', ...).eq('moderation_status', 'approved')
create index if not exists business_photos_approved_idx
  on public.business_photos (business_id, sort_order, created_at)
  where moderation_status = 'approved';

-- Supports approved cover photo attachment and public property gallery loading
-- Query: property_photos.select(...).in('property_id', ...).eq('moderation_status', 'approved')
create index if not exists property_photos_approved_idx
  on public.property_photos (property_id, sort_order, created_at)
  where moderation_status = 'approved';

-- ============================================================================
-- 12. USER PROFILES
-- ============================================================================

-- Supports admin user management fallback query sorted by registration date
-- Query: profiles.select('*').order('created_at', desc)
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);
