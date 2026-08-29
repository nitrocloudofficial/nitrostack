// Simple API Key validation
export function validateApiKey(apiKey: string): boolean {
  // In a real scenario, compare against a hashed DB value.
  // For the hackathon, use an environment variable.
  const validKey = process.env.ADMIN_API_KEY || 'supersecret-hackathon-2026';
  return apiKey === validKey;
}