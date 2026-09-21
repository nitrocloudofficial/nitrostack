# Vulnerable Test Website

This is a **deliberately insecure** test website for validating the vulnerability scanner.

## ⚠️ WARNING
This website contains intentional security vulnerabilities. **NEVER** deploy this to production or expose it to the internet!

## Purpose
Use this local test server to validate that your vulnerability scanner correctly detects:
- Missing security headers
- Insecure forms (no CSRF protection)
- Inline scripts (XSS risks)
- Mixed content (HTTP resources on HTTPS)
- Information disclosure (Server headers)
- Directory listing
- Unsafe JavaScript patterns (eval, document.write)
- Password fields with autocomplete enabled

## How to Use

### 1. Start the Test Server
```bash
node test-vulnerable-site/server.js
```

The server will run on `http://localhost:3000`

### 2. Verify Domain Ownership (Required)
Before scanning, you must verify ownership:

1. Go to the Domain Verification page in the app
2. Enter domain: `localhost:3000`
3. Select verification method: "File Upload"
4. Copy the verification token from the instructions
5. Create the verification file:
   ```bash
   echo "YOUR_TOKEN_HERE" > test-vulnerable-site/sentinel-verify.txt
   ```
6. Click "Verify Ownership" in the app
7. Once verified, you can scan the domain

### 3. Test Your Scanner
1. Go to your monitoring page
2. Add the URL: `http://localhost:3000`
3. Click "Run Vulnerability Scan"
4. Review the detected vulnerabilities

### 3. Expected Findings

The scanner should detect approximately 10-15 vulnerabilities:

**Critical/High:**
- No HTTPS (if testing HTTP)
- Missing Content-Security-Policy
- Missing Strict-Transport-Security

**Medium:**
- Missing X-Frame-Options
- Form without CSRF protection
- Mixed content detected

**Low:**
- Missing X-Content-Type-Options
- Missing X-XSS-Protection
- Missing Referrer-Policy
- Inline scripts detected
- Password field allows autocomplete
- eval() usage
- document.write() usage

**Info:**
- Server header exposed (Apache/2.4.41)
- X-Powered-By header exposed (PHP/7.4.3)

**Technologies Detected:**
- Apache
- PHP
- jQuery
- WordPress (from meta tag)

## Testing Different Scenarios

### Test HTTPS (requires SSL certificate)
You would need to set up a local HTTPS server with a self-signed certificate to test SSL-related vulnerabilities.

### Test Directory Listing
Visit: `http://localhost:3000/directory/`

## Cleanup
When done testing, stop the server with `Ctrl+C`

## Legal Notice
This test environment is for educational purposes only. Only test against:
- Your own local servers
- Websites you own or have explicit permission to test
- Designated testing platforms

Unauthorized security testing is illegal and unethical.
