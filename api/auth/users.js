/**
 * GET /api/auth/users
 * Returns a list of usernames configured in environment variables.
 * Passwords and roles are NEVER returned — only usernames.
 * Used to populate the "Enquiry By" / "Booked By" dropdowns.
 */

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const usernames = []
    for (let i = 1; i <= 10; i++) {
        const username = process.env[`USER_${i}_USERNAME`]
        if (username) usernames.push(username)
    }

    return res.status(200).json({ usernames })
}