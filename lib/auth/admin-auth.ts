/**
 * Admin authentication module
 * Uses HTTP Basic Authentication for simplicity
 */

const DEFAULT_ADMIN_PASSWORD = 'changeme123';

/**
 * Validates admin password against environment variable
 * @param password - Password to validate
 * @returns true if password matches, false otherwise
 */
export function checkAdminAuth(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  return password === adminPassword;
}

/**
 * Validates HTTP Basic Authentication header from request
 * @param request - Incoming request object
 * @returns true if authenticated, false otherwise
 */
export function isAdminAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return false;
  }

  // Check for Basic auth scheme
  if (!authHeader.startsWith('Basic ')) {
    return false;
  }

  try {
    // Extract base64 encoded credentials
    const base64Credentials = authHeader.slice(6); // Remove 'Basic ' prefix

    // Decode base64 to string (format: username:password)
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');

    // Extract password (after first colon)
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) {
      return false;
    }

    const password = credentials.slice(colonIndex + 1);

    return checkAdminAuth(password);
  } catch {
    // Handle any decoding errors
    return false;
  }
}
