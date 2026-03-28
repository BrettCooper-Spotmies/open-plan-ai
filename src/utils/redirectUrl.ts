/**
 * Get the correct redirect URL for auth flows.
 * - In production: uses the vercel.app domain
 * - In development: uses localhost
 * - Falls back to window.location.origin if needed
 */
export function getAuthRedirectUrl(path: string = '/reset-password'): string {
  if (typeof window === 'undefined') {
    return path;
  }

  const origin = window.location.origin;
  
  // For development/local testing
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return `${origin}${path}`;
  }

  // For production and staging
  return `${origin}${path}`;
}

/**
 * Get all allowed redirect URLs for Supabase configuration.
 * Update your Supabase Auth settings with these URLs.
 */
export function getAllowedRedirectUrls(): string[] {
  return [
    'http://localhost:5173/reset-password',
    'http://localhost:8080/reset-password',
    'http://localhost:3000/reset-password',
    'http://127.0.0.1:5173/reset-password',
    'http://127.0.0.1:8080/reset-password',
    'https://open-plan-ai.vercel.app/reset-password',
    'https://app.openplanai.com/reset-password',
    // Add your custom domain here
  ];
}
