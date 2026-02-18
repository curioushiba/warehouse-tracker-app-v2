interface ProfileLike {
  name?: string | null
  first_name?: string | null
  last_name?: string | null
  username?: string
  email?: string | null
}

/**
 * Derive a display name from a profile-like object.
 * Fallback chain: name > "first last" > first_name > last_name > username > email prefix > "User"
 */
export function getDisplayName(profile: ProfileLike | null | undefined): string {
  if (!profile) return 'User'

  const name = profile.name?.trim()
  if (name) return name

  const first = profile.first_name?.trim()
  const last = profile.last_name?.trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last

  if (profile.username?.trim()) return profile.username.trim()

  if (profile.email) {
    const prefix = profile.email.split('@')[0]
    if (prefix) return prefix
  }

  return 'User'
}
