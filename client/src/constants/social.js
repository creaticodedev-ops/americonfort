/** Public social profiles — set VITE_INSTAGRAM_URL in env. No third-party brand defaults. */
export const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL?.trim() || ''

export const FACEBOOK_URL = import.meta.env.VITE_FACEBOOK_URL?.trim() || ''

export const TWITTER_URL = import.meta.env.VITE_TWITTER_URL?.trim() || ''

export default { INSTAGRAM_URL, FACEBOOK_URL, TWITTER_URL }
