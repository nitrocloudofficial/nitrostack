import axios from 'axios';
import { config } from '../config/env.js';

export interface GroqAnalysisResult {
  vulnerabilities: Array<{
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string;
    line: number;
    description: string;
    cweId: string;
    originalCode: string;
    patchedCode: string;
  }>;
}

export class GroqService {
  private static readonly API_URL = config.groq.apiUrl;
  private static readonly API_KEY = config.groq.apiKey;

  static async analyzeCode(files: Array<{ path: string; content: string }>): Promise<GroqAnalysisResult> {
    if (!this.API_KEY) {
      throw new Error('Groq API key not configured');
    }

    try {
      const prompt = this.buildAnalysisPrompt(files);

      const response = await axios.post(
        `${this.API_URL}/chat/completions`,
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a security expert analyzing code for vulnerabilities. 
Analyze the provided code files and identify security vulnerabilities.
Return ONLY a valid JSON object with this exact structure:
{
  "vulnerabilities": [
    {
      "title": "Brief vulnerability title",
      "severity": "critical|high|medium|low",
      "file": "path/to/file.ext",
      "line": 123,
      "description": "Detailed description of the vulnerability and its impact",
      "cweId": "CWE-XXX",
      "originalCode": "vulnerable code snippet",
      "patchedCode": "fixed code snippet"
    }
  ]
}

Focus on:
- SQL Injection
- XSS (Cross-Site Scripting)
- Authentication/Authorization issues
- Insecure dependencies
- Hardcoded secrets
- Insecure cryptography
- Path traversal
- Command injection
- CSRF vulnerabilities
- Insecure deserialization

Be thorough but only report real vulnerabilities, not false positives.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 8000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 seconds
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Groq API');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Groq response:', content);
        throw new Error('Invalid JSON response from Groq');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // Validate and clean the result
      if (!result.vulnerabilities || !Array.isArray(result.vulnerabilities)) {
        console.warn('Invalid vulnerabilities array from Groq');
        return { vulnerabilities: [] };
      }

      // Ensure all required fields are present
      result.vulnerabilities = result.vulnerabilities.filter((v: any) => {
        return v.title && v.severity && v.file && v.line && v.description && v.cweId;
      }).map((v: any) => ({
        ...v,
        originalCode: v.originalCode || '// Code snippet not available',
        patchedCode: v.patchedCode || '// Fix not available',
      }));

      return result;
    } catch (error: any) {
      console.error('Error calling Groq API:', error.response?.data || error.message);
      throw new Error(`Groq API error: ${error.message}`);
    }
  }

  private static buildAnalysisPrompt(files: Array<{ path: string; content: string }>): string {
    let prompt = 'Analyze the following code files for security vulnerabilities:\n\n';

    for (const file of files) {
      prompt += `=== FILE: ${file.path} ===\n`;
      prompt += file.content;
      prompt += '\n\n';
    }

    prompt += '\nProvide a comprehensive security analysis in the specified JSON format.';
    return prompt;
  }

  static async analyzeRepository(repoContent: Map<string, string>): Promise<GroqAnalysisResult> {
    // This method is no longer used - batching is handled in RepoScannerService
    // Kept for backwards compatibility
    const files = Array.from(repoContent.entries()).map(([path, content]) => ({
      path,
      content,
    }));

    if (files.length === 0) {
      return { vulnerabilities: [] };
    }

    return this.analyzeCode(files);
  }
}
