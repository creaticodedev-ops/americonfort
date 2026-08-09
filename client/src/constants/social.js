/** Public social profiles — override with Vite env when the handle changes. */
export const INSTAGRAM_URL =
  import.meta.env.VITE_INSTAGRAM_URL?.trim() || 'https://www.instagram.com/hdncar/'

export default { INSTAGRAM_URL }
