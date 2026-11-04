// Khmer day and month names, written out: many browsers ship no Khmer date data and would show English
export const KH_DAYS = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍']
export const KH_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']

/** "ថ្ងៃអង្គារ ទី៤ វិច្ឆិកា" in the viewer's own time zone */
export const khDay = (d: Date) => `ថ្ងៃ${KH_DAYS[d.getDay()]} ទី${kh(d.getDate())} ${KH_MONTHS[d.getMonth()]}`

/** "២០:៣០" */
export const khTime = (d: Date) => kh(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
