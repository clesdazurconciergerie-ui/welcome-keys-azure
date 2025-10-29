# Privacy Bug Fix - Test Plan

## Issue Fixed
Dashboard was potentially showing all booklets to all users instead of scoping to owner only.

## Changes Made

### 1. Database (RLS Policies)
✅ Consolidated duplicate SELECT policies into single `booklets_owner_select`
✅ Consolidated duplicate UPDATE policies into single `booklets_owner_update`
✅ Created clean DELETE policy `booklets_owner_delete`
✅ Maintained INSERT policy with quota check `booklets_owner_insert`
✅ All policies enforce `user_id = auth.uid()`

### 2. Client Query (Dashboard.tsx)
✅ Added explicit `.eq("user_id", user.id)` filter to fetchBooklets query (line 120)
✅ Added user session validation before querying
✅ Defense-in-depth: Both RLS and client-side filtering now enforce owner-only access

## Test Cases (Must Pass)

### Test 1: Owner Isolation
**Steps:**
1. Create User A and login
2. Create booklet for User A
3. Logout and create User B
4. Create booklet for User B
5. Check User B's dashboard

**Expected:** User B sees ONLY their own booklet, not User A's

### Test 2: Direct API Query (RLS Enforcement)
**SQL Test:**
```sql
-- Login as User A (get their auth.uid())
SET request.jwt.claims = '{"sub": "<user_a_id>"}';

-- Should only return User A's booklets
SELECT id, property_name, user_id 
FROM booklets;
```

**Expected:** Only booklets where `user_id = <user_a_id>`

### Test 3: Unauthenticated Access
**Steps:**
1. Logout from all sessions
2. Try to access /dashboard

**Expected:** Redirect to /auth (no booklet data exposed)

### Test 4: Cross-User API Call Attempt
**Steps:**
1. Login as User A
2. Note User B's booklet ID
3. Try to query User B's booklet: `supabase.from('booklets').select('*').eq('id', userB_booklet_id)`

**Expected:** Empty result (RLS blocks access)

### Test 5: Related Tables Scoping
**Check these tables are properly scoped through booklets:**
- ✅ wifi_credentials
- ✅ booklet_contacts  
- ✅ equipment
- ✅ nearby_places
- ✅ faq
- ✅ activities
- ✅ essentials
- ✅ highlights
- ✅ restaurants
- ✅ transport

All have policies checking `EXISTS (SELECT 1 FROM booklets WHERE id = <table>.booklet_id AND user_id = auth.uid())`

## Security Verification

### ✅ Client Configuration
- Using anon key (not service role): `SUPABASE_PUBLISHABLE_KEY`
- RLS is enforced on all authenticated requests

### ✅ RLS Policies Status
```
booklets:
  SELECT: user_id = auth.uid() + demo expiration check
  INSERT: user_id = auth.uid() + quota check
  UPDATE: user_id = auth.uid()
  DELETE: user_id = auth.uid()
```

### ✅ Query Scoping
Dashboard query explicitly filters:
```typescript
.eq("user_id", user.id)
```

## Regression Prevention

**Before deploying any changes to booklets or dashboard:**
1. Run Test 1 (Owner Isolation) with 2 test accounts
2. Verify RLS linter shows no issues: `supabase db lint`
3. Ensure client uses anon key (never service role)
4. Check all queries include `.eq("user_id", user.id)` or rely on verified RLS

## Definition of Done ✅

- [x] RLS enabled and enforced on booklets table
- [x] Duplicate policies removed (clean, single policy per operation)
- [x] Client query includes explicit user_id filter
- [x] No service role key in client code
- [x] Related tables properly scoped through booklets FK
- [x] Test plan documented for regression prevention

## Next Steps for Verification

1. **Manual Test with 2 Users:**
   - Create test account A, add booklet
   - Create test account B, add booklet  
   - Verify each user sees only their own booklets

2. **SQL Verification:**
   ```sql
   -- Should show exactly 4 owner-scoped policies
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'booklets';
   ```

3. **Monitor Logs:**
   - Check for any RLS policy violations in Supabase logs
   - Verify no unauthorized access attempts succeed
