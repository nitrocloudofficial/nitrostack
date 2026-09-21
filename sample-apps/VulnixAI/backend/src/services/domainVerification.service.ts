import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dns from 'dns';
import { promisify } from 'util';
import crypto from 'crypto';
import { VerifiedDomain } from '../db/models/WebsiteScan.model.js';

const resolveTxt = promisify(dns.resolveTxt);

export interface VerificationRequest {
  domain: string;
  method: 'file' | 'dns' | 'meta';
}

export interface VerificationResult {
  success: boolean;
  message: string;
  token?: string;
}

export class DomainVerificationService {
  private static readonly TIMEOUT = 10000;

  /**
   * Generate a verification token for a domain
   */
  static generateVerificationToken(userId: number, domain: string): string {
    const timestamp = Date.now();
    const data = `${userId}-${domain}-${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Extract domain from URL
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Initiate domain verification
   */
  static async initiateVerification(
    userId: number,
    domain: string,
    method: 'file' | 'dns' | 'meta'
  ): Promise<{ token: string; instructions: string }> {
    const normalizedDomain = domain.replace(/^www\./, '').toLowerCase();
    const token = this.generateVerificationToken(userId, normalizedDomain);

    // Check if domain already exists
    let verifiedDomain = await VerifiedDomain.findOne({ userId, domain: normalizedDomain });

    if (verifiedDomain) {
      // Update existing record
      verifiedDomain.verificationToken = token;
      verifiedDomain.verificationMethod = method;
      verifiedDomain.verified = false;
      verifiedDomain.verifiedAt = undefined;
      await verifiedDomain.save();
    } else {
      // Create new record
      verifiedDomain = await VerifiedDomain.create({
        userId,
        domain: normalizedDomain,
        verificationToken: token,
        verificationMethod: method,
        verified: false,
      });
    }

    const instructions = this.getVerificationInstructions(normalizedDomain, token, method);

    return { token, instructions };
  }

  /**
   * Get verification instructions based on method
   */
  private static getVerificationInstructions(
    domain: string,
    token: string,
    method: 'file' | 'dns' | 'meta'
  ): string {
    switch (method) {
      case 'file':
        return `Upload a file named 'sentinel-verify.txt' to the root of your website (https://${domain}/sentinel-verify.txt) with the following content:\n\n${token}\n\nOnce uploaded, click 'Verify Ownership' to complete verification.`;

      case 'dns':
        return `Add a TXT record to your DNS configuration:\n\nName: _sentinel-verify.${domain}\nType: TXT\nValue: ${token}\n\nDNS changes may take up to 48 hours to propagate. Click 'Verify Ownership' once the record is added.`;

      case 'meta':
        return `Add the following meta tag to the <head> section of your website's homepage (https://${domain}):\n\n<meta name="sentinel-verify" content="${token}">\n\nOnce added, click 'Verify Ownership' to complete verification.`;

      default:
        return 'Unknown verification method';
    }
  }

  /**
   * Verify domain ownership
   */
  static async verifyDomain(userId: number, domain: string): Promise<VerificationResult> {
    const normalizedDomain = domain.replace(/^www\./, '').toLowerCase();

    const verifiedDomain = await VerifiedDomain.findOne({ userId, domain: normalizedDomain });

    if (!verifiedDomain) {
      return {
        success: false,
        message: 'Domain verification not initiated. Please start the verification process first.',
      };
    }

    if (verifiedDomain.verified) {
      return {
        success: true,
        message: 'Domain is already verified.',
        token: verifiedDomain.verificationToken,
      };
    }

    const { verificationToken, verificationMethod } = verifiedDomain;

    let verified = false;
    let message = '';

    try {
      switch (verificationMethod) {
        case 'file':
          verified = await this.verifyFileMethod(normalizedDomain, verificationToken);
          message = verified
            ? 'Domain verified successfully via file upload!'
            : 'Verification file not found or content does not match. Please ensure the file is accessible at the root of your domain.';
          break;

        case 'dns':
          verified = await this.verifyDNSMethod(normalizedDomain, verificationToken);
          message = verified
            ? 'Domain verified successfully via DNS record!'
            : 'DNS TXT record not found or does not match. Please ensure the record is properly configured and has propagated.';
          break;

        case 'meta':
          verified = await this.verifyMetaMethod(normalizedDomain, verificationToken);
          message = verified
            ? 'Domain verified successfully via meta tag!'
            : 'Meta tag not found or content does not match. Please ensure the meta tag is in the <head> section of your homepage.';
          break;

        default:
          return {
            success: false,
            message: 'Invalid verification method.',
          };
      }

      if (verified) {
        verifiedDomain.verified = true;
        verifiedDomain.verifiedAt = new Date();
        await verifiedDomain.save();
      }

      return {
        success: verified,
        message,
        token: verificationToken,
      };
    } catch (error: any) {
      console.error('Verification error:', error);
      return {
        success: false,
        message: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Verify via file upload method
   */
  private static async verifyFileMethod(domain: string, expectedToken: string): Promise<boolean> {
    try {
      const url = `https://${domain}/sentinel-verify.txt`;
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        validateStatus: (status) => status === 200,
      });

      const content = response.data.toString().trim();
      return content === expectedToken;
    } catch (error) {
      // Try HTTP if HTTPS fails
      try {
        const url = `http://${domain}/sentinel-verify.txt`;
        const response = await axios.get(url, {
          timeout: this.TIMEOUT,
          validateStatus: (status) => status === 200,
        });

        const content = response.data.toString().trim();
        return content === expectedToken;
      } catch (httpError) {
        return false;
      }
    }
  }

  /**
   * Verify via DNS TXT record method
   */
  private static async verifyDNSMethod(domain: string, expectedToken: string): Promise<boolean> {
    try {
      const records = await resolveTxt(`_sentinel-verify.${domain}`);
      
      // DNS TXT records are returned as arrays of strings
      for (const record of records) {
        const value = Array.isArray(record) ? record.join('') : record;
        if (value.trim() === expectedToken) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify via meta tag method
   */
  private static async verifyMetaMethod(domain: string, expectedToken: string): Promise<boolean> {
    try {
      const url = `https://${domain}`;
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const metaTag = $('meta[name="sentinel-verify"]').attr('content');

      return metaTag?.trim() === expectedToken;
    } catch (error) {
      // Try HTTP if HTTPS fails
      try {
        const url = `http://${domain}`;
        const response = await axios.get(url, {
          timeout: this.TIMEOUT,
          maxRedirects: 5,
        });

        const $ = cheerio.load(response.data);
        const metaTag = $('meta[name="sentinel-verify"]').attr('content');

        return metaTag?.trim() === expectedToken;
      } catch (httpError) {
        return false;
      }
    }
  }

  /**
   * Check if domain is verified for user
   */
  static async isDomainVerified(userId: number, url: string): Promise<boolean> {
    try {
      const domain = this.extractDomain(url);
      const verifiedDomain = await VerifiedDomain.findOne({
        userId,
        domain,
        verified: true,
      });

      return !!verifiedDomain;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all verified domains for user
   */
  static async getVerifiedDomains(userId: number) {
    return await VerifiedDomain.find({ userId, verified: true }).sort({ verifiedAt: -1 });
  }

  /**
   * Get all domains (verified and pending) for user
   */
  static async getAllDomains(userId: number) {
    return await VerifiedDomain.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Delete domain verification
   */
  static async deleteDomain(userId: number, domain: string): Promise<boolean> {
    const result = await VerifiedDomain.deleteOne({ userId, domain });
    return result.deletedCount > 0;
  }

  /**
   * Add domain as owned (bypass verification)
   * Use with caution - only for development or trusted scenarios
   */
  static async addOwnedDomain(userId: number, domain: string): Promise<{ success: boolean; message: string; domain: string }> {
    try {
      const normalizedDomain = domain.replace(/^www\./, '').toLowerCase();
      const token = this.generateVerificationToken(userId, normalizedDomain);

      // Check if domain already exists
      let verifiedDomain = await VerifiedDomain.findOne({ userId, domain: normalizedDomain });

      if (verifiedDomain) {
        if (verifiedDomain.verified) {
          return {
            success: true,
            message: 'Domain is already verified',
            domain: normalizedDomain,
          };
        }
        
        // Update existing record to verified
        verifiedDomain.verified = true;
        verifiedDomain.verifiedAt = new Date();
        verifiedDomain.verificationToken = token;
        verifiedDomain.verificationMethod = 'file'; // Default method
        await verifiedDomain.save();
      } else {
        // Create new verified domain
        verifiedDomain = await VerifiedDomain.create({
          userId,
          domain: normalizedDomain,
          verificationToken: token,
          verificationMethod: 'file',
          verified: true,
          verifiedAt: new Date(),
        });
      }

      return {
        success: true,
        message: 'Domain added as owned successfully',
        domain: normalizedDomain,
      };
    } catch (error: any) {
      console.error('Error adding owned domain:', error);
      return {
        success: false,
        message: error.message || 'Failed to add owned domain',
        domain: domain,
      };
    }
  }
}
