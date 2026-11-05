/** Fan levels and badges as the site shows them (movie-api decides who has which) */
export const FAN_BADGES: Record<string, { icon: string; label: string }> = {
  STREAK_7: { icon: '🔥', label: 'ចុះឈ្មោះ ៧ ថ្ងៃជាប់' },
  STREAK_30: { icon: '🏆', label: 'ចុះឈ្មោះ ៣០ ថ្ងៃជាប់' },
  LOVED: { icon: '💖', label: 'មតិទទួលបានចូលចិត្ត ២០+' },
  TOP_FAN: { icon: '👑', label: 'អ្នកគាំទ្រកំពូល' }
}

/** Episodes finished to reach each level (level 1 is everyone), as movie-api's FAN_LEVELS */
export const FAN_LEVELS = [0, 10, 50, 150, 400, 1000]
