# Email Verification Testing Guide

## 🧪 Testing Checklist

### Step 1: Verify Supabase Configuration

**Before testing, ensure:**
- [ ] Site URL is set in Supabase Dashboard
- [ ] Redirect URLs are whitelisted
- [ ] Email Confirmations are enabled
- [ ] Password Recovery is enabled

### Step 2: Test Signup Flow

1. **Open your app:**
   - Go to: `http://localhost:3000/register`

2. **Sign up with a test email:**
   - Enter all required fields
   - Use a real email address you can access
   - Click "Sign Up"

3. **Check for success message:**
   - Should see: "Account created successfully! Please check your email to verify your account."
   - Should redirect to `/verify-email` page

4. **Check browser console:**
   - Open browser DevTools (F12)
   - Check Console tab for any errors
   - Should see no errors related to signup

### Step 3: Check Email Inbox

1. **Open your email inbox:**
   - Check the email you used for signup
   - Check spam/junk folder if not in inbox
   - Wait 1-2 minutes for email to arrive

2. **Email should contain:**
   - Subject: "Confirm your signup" or similar
   - Link to verify email
   - Should redirect to: `http://localhost:3000/auth/callback?code=xxx`

### Step 4: Test Email Verification

1. **Click the verification link in email:**
   - Should redirect to `/auth/callback`
   - Should show "Verifying Email..." message
   - Should change to "Email Verified!" message
   - Should redirect to homepage after 2 seconds

2. **Check browser console:**
   - Should see: "User profile created successfully" (if new user)
   - Should see no errors

3. **Verify user is logged in:**
   - Should be able to access protected pages
   - Should see user name/email in navigation

### Step 5: Test Password Reset

1. **Go to forgot password:**
   - Navigate to: `http://localhost:3000/forgot-password`
   - Enter your email address
   - Click "Send Reset Link"

2. **Check email inbox:**
   - Should receive password reset email
   - Click the reset link

3. **Reset password:**
   - Should redirect to `/reset-password`
   - Enter new password
   - Confirm password
   - Click "Update Password"

4. **Verify password change:**
   - Should redirect to `/login`
   - Try logging in with new password
   - Should work successfully

---

## 🔍 Debugging Steps

### Issue: Email not received

**Check:**
1. **Supabase Dashboard:**
   - Go to: Authentication → Users
   - Check if user was created
   - Check if email is confirmed

2. **Browser Console:**
   - Open DevTools → Console
   - Look for errors during signup
   - Check Network tab for API calls

3. **Supabase Logs:**
   - Go to: Supabase Dashboard → Logs
   - Check for email sending errors

4. **Email Configuration:**
   - Verify Supabase email settings are enabled
   - Check if SMTP is configured (if using custom SMTP)

### Issue: "Invalid redirect URL"

**Solution:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Verify redirect URLs are added:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`
3. Ensure Site URL matches: `http://localhost:3000`

### Issue: "Code exchange failed"

**Possible causes:**
- Code expired (usually 1 hour)
- Invalid redirect URL
- Site URL mismatch

**Solution:**
- Request new verification email
- Verify redirect URLs in Supabase Dashboard
- Check Site URL configuration

### Issue: "User profile creation failed"

**Check:**
1. Browser console for errors
2. Supabase Dashboard → Database → Users table
3. Check if profile exists despite error

---

## 📊 Expected Flow

### Signup Flow:
```
User fills form → Click Sign Up
  ↓
Backend: signUp() called
  ↓
Supabase: Creates user, sends verification email
  ↓
User receives email
  ↓
User clicks verification link
  ↓
Redirects to /auth/callback?code=xxx
  ↓
Frontend: exchangeCodeForSession(code)
  ↓
Session created → Profile created → Redirect to home
```

### Password Reset Flow:
```
User requests reset → Enter email
  ↓
Backend: resetPasswordForEmail()
  ↓
Supabase: Sends reset email
  ↓
User receives email
  ↓
User clicks reset link
  ↓
Redirects to /reset-password#access_token=xxx
  ↓
Frontend: Validates token → User enters new password
  ↓
Password updated → Redirect to login
```

---

## ✅ Success Indicators

**Signup:**
- ✅ Success message shown
- ✅ Redirect to `/verify-email`
- ✅ Email received within 2 minutes
- ✅ Verification link works
- ✅ User logged in after verification

**Password Reset:**
- ✅ Success message shown
- ✅ Email received within 2 minutes
- ✅ Reset link works
- ✅ Password can be updated
- ✅ Can login with new password

---

## 🐛 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid redirect URL" | URL not whitelisted | Add URL to Supabase Dashboard |
| "Email not sent" | Email disabled | Enable in Supabase Settings |
| "Code expired" | Link too old | Request new email |
| "User already exists" | Email already registered | Use different email or login |
| "Profile creation failed" | Database error | Check console for details |

---

## 📝 Testing Checklist

**Before testing:**
- [ ] Frontend server running (`npm run dev`)
- [ ] Backend server running (if needed)
- [ ] Supabase configured (redirect URLs, email enabled)
- [ ] Test email account ready

**During testing:**
- [ ] Signup works
- [ ] Email received
- [ ] Verification link works
- [ ] User logged in after verification
- [ ] Password reset works
- [ ] Can login with new password

**After testing:**
- [ ] No errors in browser console
- [ ] No errors in Supabase logs
- [ ] User profile created in database
- [ ] Email confirmed in Supabase Dashboard

