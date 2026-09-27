# Deployment Checklist - Penetration Testing Fix

## Pre-Deployment

- [x] Code changes completed
- [x] TypeScript compilation successful
- [x] No diagnostic errors

## Deployment Steps

### Step 1: Commit Changes
```bash
git add backend/src/services/penetrationTesting.service.ts
git add backend/src/controllers/websiteScan.controller.ts
git add PENETRATION_TESTING_PRODUCTION_FIX.md
git add QUICK_FIX_SUMMARY.md
git add DEPLOYMENT_CHECKLIST.md
git commit -m "Fix: Penetration testing now works in production

- Implemented batched test execution (5 tests at a time)
- Reduced timeouts from 15s to 8s for production compatibility
- Added environment-aware HTTPS agent
- Enhanced error handling and logging
- Added 2-minute timeout protection in controller

Fixes issue where penetration testing showed 0 vulnerabilities in production"
```

### Step 2: Push to Repository
```bash
git push origin main
```

### Step 3: Verify Deployment
Wait for your hosting provider to deploy (usually 2-5 minutes), then check:

#### A. Check Deployment Status
- **Vercel**: Visit your dashboard at https://vercel.com
- **Render**: Visit your dashboard at https://render.com
- **Other**: Check your hosting provider's dashboard

#### B. Verify Backend is Running
```bash
curl https://your-backend-url.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "database": "connected",
  "environment": "production"
}
```

### Step 4: Test Penetration Testing

#### A. Get Authentication Token
Login to your frontend and copy the JWT token from browser DevTools:
1. Open DevTools (F12)
2. Go to Application/Storage → Cookies
3. Copy the auth token value

#### B. Test the Endpoint
```bash
curl -X POST https://your-backend-url.com/api/website-scan/pentest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"url": "https://pinmypic.online"}' \
  -v
```

#### C. Expected Response
```json
{
  "url": "https://pinmypic.online",
  "testDate": "2024-...",
  "testsPerformed": 28,
  "vulnerabilitiesFound": 5,
  "results": [...],
  "riskScore": 45,
  "_id": "..."
}
```

### Step 5: Monitor Logs

#### Vercel
```bash
vercel logs --follow
```

#### Render
Visit: Dashboard → Your Service → Logs

#### Look for these log patterns:
```
✅ Good Signs:
Starting penetration test for: https://pinmypic.online
Environment: production
Running test batch 1/6
  ✓ XSS completed
  ✓ SQL Injection completed
Penetration test completed. Vulnerabilities found: X

❌ Warning Signs:
  ✗ Test Name failed: timeout
  ✗ Test Name failed: network error
Error performing penetration test: ...
```

## Post-Deployment Verification

### 1. Functional Tests
- [ ] Can initiate penetration test from frontend
- [ ] Test completes within 3-4 minutes
- [ ] Results are displayed correctly
- [ ] Results are saved to database
- [ ] Can view test history

### 2. Performance Tests
- [ ] No timeout errors
- [ ] Response time < 5 minutes
- [ ] Server doesn't crash under load
- [ ] Memory usage is stable

### 3. Error Handling Tests
- [ ] Invalid URLs are rejected
- [ ] Unverified domains are blocked
- [ ] Network errors are handled gracefully
- [ ] Timeout errors show helpful messages

## Rollback Plan (If Needed)

If something goes wrong:

### Option 1: Git Revert
```bash
git revert HEAD
git push origin main
```

### Option 2: Redeploy Previous Version
```bash
git reset --hard HEAD~1
git push origin main --force
```

### Option 3: Manual Rollback
In your hosting dashboard:
1. Go to Deployments
2. Find the previous working deployment
3. Click "Redeploy" or "Rollback"

## Environment Variables Check

Ensure these are set in production:

```bash
# Required
NODE_ENV=production
MONGO_URI=mongodb://...
FRONTEND_URL=https://your-frontend.com

# Optional but recommended
JWT_SECRET=your-secure-secret
GROQ_API_KEYS=key1,key2,key3
GEMINI_API_KEYS=key1,key2,key3
```

## Common Issues & Solutions

### Issue: "Penetration test timeout"
**Solution**: Increase timeout in controller from 120s to 180s

### Issue: "Network error" in logs
**Solution**: Check hosting provider's firewall rules, ensure outbound HTTPS is allowed

### Issue: "Domain not verified"
**Solution**: User needs to verify domain ownership first via the verification flow

### Issue: Still showing 0 vulnerabilities
**Solution**: 
1. Check if target URL is accessible from production
2. Verify MongoDB connection
3. Review detailed logs for specific test failures

## Success Criteria

✅ Deployment is successful when:
1. Backend builds without errors
2. Health check returns 200 OK
3. Penetration test completes with results
4. Vulnerabilities are detected (if present)
5. Results are saved to database
6. Frontend displays results correctly
7. No timeout errors in logs
8. No memory leaks or crashes

## Support

If you encounter issues:
1. Check `QUICK_FIX_SUMMARY.md` for quick troubleshooting
2. Review `PENETRATION_TESTING_PRODUCTION_FIX.md` for detailed analysis
3. Check production logs for specific error messages
4. Verify all environment variables are set correctly

## Next Steps After Successful Deployment

1. Monitor production logs for 24 hours
2. Collect user feedback
3. Consider implementing:
   - Progress indicators for long-running tests
   - Test result caching
   - Selective test execution (let users choose categories)
   - Job queue for async processing
   - Rate limiting on the endpoint

## Deployment Date
- Date: _______________
- Deployed by: _______________
- Version: _______________
- Status: _______________

## Notes
_Add any deployment-specific notes here_
