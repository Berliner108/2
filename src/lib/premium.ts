export type PremiumProfile = {
  premium_exempt?: boolean | null
  premium_trial_ends_at?: string | null
  premium_until?: string | null
}

export function hasPremiumAccess(profile: PremiumProfile | null | undefined): boolean {
  if (!profile) return false

  if (profile.premium_exempt === true) {
    return true
  }

  const now = Date.now()

  const trialEndsAt = profile.premium_trial_ends_at
    ? new Date(profile.premium_trial_ends_at).getTime()
    : 0

  const premiumUntil = profile.premium_until
    ? new Date(profile.premium_until).getTime()
    : 0

  return trialEndsAt > now || premiumUntil > now
}