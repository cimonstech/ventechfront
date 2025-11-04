# Rate Limit Error (429) - Troubleshooting Guide

## 🚨 What is a 429 Error?

**429 "Too Many Requests"** means Supabase has temporarily blocked your requests because you've exceeded the rate limit.

## 🔍 Common Causes

### 1. Too Many Signup Attempts
- **Cause:** Multiple signup attempts in a short period
- **Solution:** Wait 5-15 minutes before trying again

### 2. Too Many Password Reset Requests
- **Cause:** Multiple password reset requests for the same email
- **Solution:** Wait 5-15 minutes, check spam folder for existing email

### 3. Too Many Verification Email Requests
- **Cause:** Clicking "Resend Verification Email" multiple times
- **Solution:** Wait 5-15 minutes, check spam folder

### 4. Free Tier Limits
- **Cause:** Exceeding Supabase free tier rate limits
- **Solution:** Wait or upgrade your Supabase plan

## ✅ Solutions

### Immediate Solutions:

1. **Wait 5-15 Minutes**
   - Rate limits usually reset after 5-15 minutes
   - Don't keep trying immediately

2. **Check Your Email Inbox**
   - You might have already received the email
   - Check spam/junk folder
   - Look for emails from Supabase

3. **Use a Different Email**
   - If you need to test immediately
   - Use a different email address

4. **Check Supabase Dashboard**
   - Go to: Supabase Dashboard → Logs
   - Check for rate limit errors
   - Monitor your API usage

### Long-term Solutions:

1. **Upgrade Supabase Plan**
   - Free tier: Limited rate limits
   - Pro tier: Higher rate limits
   - Go to: Supabase Dashboard → Settings → Billing

2. **Implement Rate Limiting on Frontend**
   - Add cooldown timers
   - Disable buttons after failed attempts
   - Show user-friendly messages

3. **Monitor API Usage**
   - Check Supabase Dashboard → Logs
   - Set up alerts for rate limits
   - Track your usage patterns

## 📊 Rate Limits by Supabase Plan

### Free Tier:
- **Auth API:** ~50 requests/minute per user
- **Email Sending:** Limited
- **Database Queries:** ~500 requests/minute

### Pro Tier:
- **Auth API:** Higher limits
- **Email Sending:** More emails included
- **Database Queries:** Higher limits

## 🛠️ How We've Handled It

### 1. Better Error Messages
- Clear error messages for 429 errors
- User-friendly notifications
- Cooldown timers

### 2. Cooldown Periods
- **Resend Verification:** 60 seconds cooldown
- **Rate Limit:** 5 minutes cooldown
- **Password Reset:** User-friendly messages

### 3. Error Handling
- Detects 429 errors specifically
- Shows appropriate messages
- Prevents spam requests

## 🧪 Testing After Rate Limit

### Step 1: Wait
- Wait 5-15 minutes
- Don't make any requests during this time

### Step 2: Check Email
- Check your inbox
- Check spam folder
- Look for existing verification emails

### Step 3: Try Again
- Use a different email if needed
- Or wait for rate limit to reset
- Try with a fresh browser session

### Step 4: Monitor
- Check browser console for errors
- Check Supabase Dashboard → Logs
- Verify no 429 errors

## 📝 Prevention Tips

1. **Don't Spam Requests**
   - Wait between signup attempts
   - Don't click "Resend" multiple times
   - Use cooldown timers

2. **Check Email First**
   - Always check inbox/spam before resending
   - Wait 1-2 minutes for email to arrive

3. **Use Different Emails for Testing**
   - Use multiple test emails
   - Don't test with same email repeatedly

4. **Monitor Usage**
   - Check Supabase Dashboard regularly
   - Set up usage alerts
   - Track your API calls

## 🐛 Debugging

### Check Browser Console:
```javascript
// Look for 429 errors
// Check Network tab for failed requests
// Look for rate limit messages
```

### Check Supabase Dashboard:
1. Go to: Supabase Dashboard → Logs
2. Filter by "429" errors
3. Check API usage graphs
4. Monitor rate limit hits

### Check Email Provider:
- Check if emails are being blocked
- Verify email addresses are valid
- Check spam folder settings

## ✅ Verification Checklist

After fixing 429 errors:

- [ ] Waited 5-15 minutes
- [ ] Checked email inbox/spam
- [ ] Tried with different email
- [ ] No 429 errors in browser console
- [ ] No 429 errors in Supabase logs
- [ ] Email received successfully
- [ ] Verification works

## 📞 Need Help?

If you continue to see 429 errors:

1. **Check Supabase Status:** https://status.supabase.com
2. **Check Your Usage:** Supabase Dashboard → Settings → Usage
3. **Contact Support:** If rate limits seem too low for your usage

## 🎯 Quick Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 429 | Too Many Requests | Wait 5-15 minutes |
| Rate Limit | Exceeded limits | Check email, wait, or upgrade plan |
| Email Not Sent | Rate limited | Wait before resending |

