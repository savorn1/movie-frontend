export type ReportReason = 'video' | 'subtitles' | 'audio' | 'other'

export interface ProblemReport {
  id: string
  seriesId: number
  ep: number
  reason: ReportReason
  note: string
  /** Second in the episode when reported */
  time: number
  at: number
  resolved: boolean
}

export const REPORT_REASONS: Record<ReportReason, string> = {
  video: 'វីដេអូមិនដើរ',
  subtitles: 'អក្សររត់ខុស',
  audio: 'សំឡេងមានបញ្ហា',
  other: 'ផ្សេងៗ'
}

const KEY = 'all'
const MAX = 1000

export async function getReports() {
  return (await useStorage('reports').getItem<ProblemReport[]>(KEY)) ?? []
}

export async function saveReports(list: ProblemReport[]) {
  await useStorage('reports').setItem(KEY, list.slice(0, MAX))
}
