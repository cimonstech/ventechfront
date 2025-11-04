# Supabase Configuration Guide for Email Verification & Password Reset

## 🎯 Quick Setup Checklist

- [ ] Configure Site URL
- [ ] Add Redirect URLs
- [ ] Enable Email Confirmations
- [ ] Enable Password Recovery
- [ ] (Optional) Configure Resend SMTP for Supabase Auth Emails

---

## 📋 Step-by-Step Configuration

### Step 1: Configure Site URL and Redirect URLs

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/ibrokmmepywrrgakoleh
   - Navigate to: **Authentication** → **URL Configuration**

2. **Set Site URL:**
   - **Site URL:** `http://localhost:3000` (for development)
   - **For production:** `https://yourdomain.com`

3. **Add Redirect URLs:**
   Click "Add URL" and add these **one by one**:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/reset-password
   https://yourdomain.com/auth/callback
   https://yourdomain.com/reset-password
   ```

   **Important:** Add both development and production URLs!

---

### Step 2: Enable Email Confirmations

1. **Go to:** **Authentication** → **Settings**
2. **Enable Email Confirmations:**
   - Toggle **"Enable Email Confirmations"** to **ON**
   - This requires users to verify their email before logging in

3. **Enable Password Recovery:**
   - Toggle **"Enable Password Recovery"** to **ON**
   - This allows users to reset their passwords

4. **Enable Email Signup:**
   - Toggle **"Enable Email Signup"** to **ON**
   - This allows users to sign up with email

---

### Step 3: (Optional) Configure Resend SMTP for Supabase Auth Emails

If you want Supabase auth emails (verification, password reset) to also use Resend instead of Supabase's default email service:

1. **Go to:** **Authentication** → **Settings** → **SMTP Settings**

2. **Enable Custom SMTP:**
   - Toggle **"Enable Custom SMTP"** to **ON**

3. **Configure Resend SMTP:**
   
   **For Resend SMTP, use these settings:**
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: re_MnujjdYu_121DroDAHMe5fbZbAp1S8ccF (your Resend API key)
   Sender Name: VENTECH GADGETS
   Sender Email: support@ventechgadgets.com (or noreply@ventechgadgets.com)
   ```

   **Note:** 
   - The sender email must be verified in Resend Dashboard
   - If your domain isn't verified yet, use `onboarding@resend.dev` for testing

4. **Save Settings**

---

## 📧 Email Configuration Summary

### Backend Emails (Order confirmations, contact forms, etc.)
- ✅ **Uses:** Resend API directly
- ✅ **Configured in:** Backend `.env` file
- ✅ **Works:** Automatically after domain verification

### Supabase Auth Emails (Verification, password reset)
- ✅ **Uses:** Supabase default email service (recommended)
   - OR
- ✅ **Uses:** Resend SMTP (if configured in Step 3)

---

## 🧪 Testing Your Configuration

### Test Email Verification:

1. **Sign up a new user:**
   - Go to `/register`
   - Create an account
   - Check email inbox

2. **Click verification link:**
   - Should redirect to `/auth/callback`
   - Should verify email and redirect to home

3. **Test resend verification:**
   - Go to `/verify-email`
   - Click "Resend Verification Email"
   - Should receive new email

### Test Password Reset:

1. **Request password reset:**
   - Go to `/forgot-password`
   - Enter email address
   - Check email inbox

2. **Click reset link:**
   - Should redirect to `/reset-password`
   - Should allow setting new password

3. **Verify new password:**
   - Login with new password
   - Should work successfully

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Invalid redirect URL"
**Solution:**
- Check that redirect URLs are added in Supabase Dashboard
- URLs must match exactly (including http/https, trailing slashes)

### Issue 2: Email not sending
**Solution:**
- Check Supabase Dashboard → Authentication → Settings
- Verify "Enable Email Confirmations" is ON
- Check spam folder
- Verify SMTP settings if using custom SMTP

### Issue 3: "Code exchange failed"
**Solution:**
- Check that Site URL is configured correctly
- Verify redirect URLs are whitelisted
- Check that code hasn't expired (usually 1 hour)

### Issue 4: Domain verification for Resend
**Solution:**
- Go to https://resend.com/domains
- Add `ventechgadgets.com`
- Add DNS records (SPF, DKIM)
- Wait for verification

---

## 📝 Quick Reference

### Supabase Dashboard URLs:
- **Project:** https://supabase.com/dashboard/project/ibrokmmepywrrgakoleh
- **URL Configuration:** Authentication → URL Configuration
- **Email Settings:** Authentication → Settings
- **SMTP Settings:** Authentication → Settings → SMTP Settings

### Required Redirect URLs:
```
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
https://yourdomain.com/auth/callback
https://yourdomain.com/reset-password
```

### Resend SMTP Settings (if using):
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: your_resend_api_key
Sender: support@ventechgadgets.com
```

---

## ✅ Verification Checklist

After configuration, verify:

- [ ] Site URL is set to `http://localhost:3000` (or production URL)
- [ ] All 4 redirect URLs are added and whitelisted
- [ ] Email Confirmations are enabled
- [ ] Password Recovery is enabled
- [ ] Email Signup is enabled
- [ ] (Optional) Resend SMTP is configured if you want custom emails
- [ ] Test signup → receive email → verify works
- [ ] Test password reset → receive email → reset works

---

## 🎉 You're Done!

Once configured, your authentication flow will work:
- ✅ Users can sign up and verify their email
- ✅ Users can reset their passwords
- ✅ All emails use Resend API (backend) or Resend SMTP (Supabase auth)

