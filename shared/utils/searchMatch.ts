/*
 * Forgiving search: Khmer titles also match the way people spell them in Latin letters ("sneha" finds
 * ស្នេហា), and Latin words tolerate a typo or two. Pure functions, used by the catalog search.
 */

const CONSONANTS: Record<string, string> = {
  'ក': 'k', 'ខ': 'kh', 'គ': 'k', 'ឃ': 'kh', 'ង': 'ng',
  'ច': 'ch', 'ឆ': 'chh', 'ជ': 'ch', 'ឈ': 'chh', 'ញ': 'nh',
  'ដ': 'd', 'ឋ': 'th', 'ឌ': 'd', 'ឍ': 'th', 'ណ': 'n',
  'ត': 't', 'ថ': 'th', 'ទ': 't', 'ធ': 'th', 'ន': 'n',
  'ប': 'b', 'ផ': 'ph', 'ព': 'p', 'ភ': 'ph', 'ម': 'm',
  'យ': 'y', 'រ': 'r', 'ល': 'l', 'វ': 'v', 'ស': 's',
  'ហ': 'h', 'ឡ': 'l', 'អ': ''
}

const VOWELS: Record<string, string> = {
  'ា': 'a', 'ិ': 'i', 'ី': 'i', 'ឹ': 'e', 'ឺ': 'eu', 'ុ': 'o', 'ូ': 'ou', 'ួ': 'uo',
  'ើ': 'ae', 'ឿ': 'oea', 'ៀ': 'ie', 'េ': 'e', 'ែ': 'ae', 'ៃ': 'ai', 'ោ': 'ao', 'ៅ': 'au',
  'ំ': 'm', 'ះ': 'h', 'ៈ': 'a',
  // Independent vowels
  'ឥ': 'e', 'ឦ': 'ei', 'ឧ': 'o', 'ឩ': 'ou', 'ឪ': 'ov', 'ឫ': 'rue', 'ឬ': 'rue', 'ឭ': 'lue', 'ឮ': 'lue',
  'ឯ': 'ae', 'ឰ': 'ai', 'ឱ': 'ao', 'ឲ': 'ao', 'ឳ': 'au'
}

const DIGITS = '០១២៣៤៥៦៧៨៩'

/**
 * A rough Latin spelling of Khmer text, close to how people type titles on Latin keyboards
 * (ស្នេហា → "sneha", ក្បាច់គុន → "kbachkon"). Not a formal transliteration; good enough to search by.
 */
export function khmerToLatin(text: string): string {
  let out = ''
  for (const ch of text) {
    if (ch in CONSONANTS) out += CONSONANTS[ch]
    else if (ch in VOWELS) out += VOWELS[ch]
    else if (DIGITS.includes(ch)) out += String(DIGITS.indexOf(ch))
    // Coeng (subscript), diacritics and zero-width marks add no letters
    else if (/[឴-៝​-‍]/.test(ch)) continue
    else out += ch
  }
  return out
}

/** Edits (insert, delete, substitute) to turn a into b, giving up above `max` */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, row[j]!)
    }
    if (best > max) return max + 1
    prev = row
  }
  return prev[b.length]!
}

/** Typos allowed for a word of this length: none under 4 letters, one up to 6, two from 7 */
export const typosAllowed = (word: string) => (word.length < 4 ? 0 : word.length < 7 ? 1 : 2)

/**
 * Does the typed word match a word of the title? Starting letters match ("sne" → "sneha"); longer
 * words also match with a typo or two, as a whole word or as the start of one ("snaha" → "sneha").
 */
export function wordMatches(typed: string, word: string): boolean {
  if (word.startsWith(typed)) return true
  const allowed = typosAllowed(typed)
  if (!allowed) return false
  return editDistance(typed, word, allowed) <= allowed || editDistance(typed, word.slice(0, typed.length), allowed) <= allowed
}
