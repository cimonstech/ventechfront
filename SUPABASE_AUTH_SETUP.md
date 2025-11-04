# Supabase Authentication Setup Guide

## ✅ Required Supabase Dashboard Configuration

### 1. **Site URL Configuration**
In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: Set to your production domain (e.g., `https://yourdomain.com`)
- **Redirect URLs**: Add these URLs (for both development and production):
  ```
  http://localhost:3000/auth/callback
  https://yourdomain.com/auth/callback
  http://localhost:3000/reset-password
  https://yourdomain.com/reset-password
  ```

### 2. **Email Confirmation Settings**
In Supabase Dashboard → Authentication → Settings:
- ✅ **Enable Email Confirmations**: Toggle ON
- ✅ **Enable Password Recovery**: Toggle ON
- ✅ **Enable Email Signup**: Toggle ON

### 3. **SMTP Configuration (Optional but Recommended)**
In Supabase Dashboard → Authentication → SMTP Settings:
- Configure your custom SMTP server OR use Supabase's default email service
- This ensures emails are delivered reliably

### 4. **Email Templates (Optional)**
In Supabase Dashboard → Authentication → Email Templates:
- Customize "Confirm signup" template
- Customize "Reset password" template
- These templates use `{{ .ConfirmationURL }}` for the verification link

## 🔍 How Email Verification Works

### Signup Flow:
1. User signs up → `signUp()` called with `emailRedirectTo: /auth/callback`
2. Supabase sends verification email with link containing `code` parameter
3. User clicks link → Redirected to `/auth/callback?code=xxx`
4. Callback page calls `exchangeCodeForSession(code)` 
5. Session created → User profile created → Redirected to home

### Password Reset Flow:
1. User requests reset → `resetPasswordForEmail()` called with `redirectTo: /reset-password`
2. Supabase sends email with link containing `access_token` and `refresh_token` in hash
3. User clicks link → Redirected to `/reset-password#access_token=xxx&refresh_token=xxx&type=recovery`
4. Reset page validates tokens → User enters new password
5. Password updated → Redirected to login

## ⚠️ Common Issues

### Issue 1: "Invalid redirect URL"
**Solution**: Add all redirect URLs to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

### Issue 2: Email not sending
**Solution**: 
- Check SMTP settings in Supabase Dashboard
- Verify email provider is enabled
- Check spam folder

### Issue 3: "Code exchange failed"
**Solution**:
- Ensure redirect URL matches exactly what's configured in Supabase
- Check that the code hasn't expired (usually 1 hour)
- Verify Site URL is set correctly

### Issue 4: "User already registered" but can't login
**Solution**:
- Check if email is confirmed in Supabase Dashboard → Authentication → Users
- Manually confirm email or resend verification email

## 🧪 Testing Checklist

- [ ] Site URL configured in Supabase Dashboard
- [ ] All redirect URLs added to whitelist
- [ ] Email confirmations enabled
- [ ] Password recovery enabled
- [ ] Test signup → receive email → click link → verify works
- [ ] Test password reset → receive email → click link → reset works
- [ ] Test resend verification email → works

## 📝 Code Verification

The implementation correctly:
- ✅ Uses `exchangeCodeForSession()` for email verification
- ✅ Uses `setSession()` for password reset tokens
- ✅ Handles both query params and hash-based redirects
- ✅ Creates user profiles automatically
- ✅ Redirects to correct pages after verification/reset

