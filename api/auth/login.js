/**
 * POST /api/auth/login
 * Validates username/password against environment variables.
 * Returns user info (username + role) on success.
 * Credentials NEVER leave the server.
 */

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' })
  }

  // Check up to 10 user slots (USER_1 through USER_10)
  for (let i = 1; i <= 10; i++) {
    const envUser = process.env[`USER_${i}_USERNAME`]
    const envPass = process.env[`USER_${i}_PASSWORD`]
    const envRole = process.env[`USER_${i}_ROLE`]

    if (!envUser) continue

    if (envUser === username && envPass === password) {
      return res.status(200).json({ username: envUser, role: envRole || 'staff' })
    }
  }

  return res.status(401).json({ message: 'Invalid username or password' })
}
