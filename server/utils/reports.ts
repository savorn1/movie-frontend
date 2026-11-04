import { randomUUID } from 'node:crypto'

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

/*
 * Problem reports, kept in VideoLingo's database through movie-api when movieApiEnabled(), else in .data (newest first,
 * the latest 1000).
 */
const KEY = 'all'
const MAX = 1000

interface ApiReport {
  id: number
  seriesId: number
  episode: number
  reason: 'VIDEO' | 'SUBTITLES' | 'AUDIO' | 'OTHER'
  note: string
  positionSeconds: number
  createdAt: string
  resolvedAt: string | null
}

const fromApi = (r: ApiReport): ProblemReport => ({
  id: String(r.id),
  seriesId: r.seriesId,
  ep: r.episode,
  reason: r.reason.toLowerCase() as ReportReason,
  note: r.note,
  time: r.positionSeconds,
  at: new Date(r.createdAt).getTime(),
  resolved: !!r.resolvedAt
})

const localStore = () => useStorage('reports')

/** All reports, newest first */
export async function getReports(): Promise<ProblemReport[]> {
  if (movieApiEnabled()) {
    return (await apiCall<ApiReport[]>('GET', '/reports?includeResolved=true')).map(fromApi)
  }
  return (await localStore().getItem<ProblemReport[]>(KEY)) ?? []
}

export async function addReport(input: Omit<ProblemReport, 'id' | 'at' | 'resolved'>): Promise<ProblemReport> {
  if (movieApiEnabled()) {
    return fromApi(await apiCall<ApiReport>('POST', '/reports', {
      seriesId: input.seriesId,
      episode: input.ep,
      reason: input.reason.toUpperCase(),
      note: input.note,
      positionSeconds: input.time
    }))
  }
  const report: ProblemReport = { ...input, id: randomUUID(), at: Date.now(), resolved: false }
  await localStore().setItem(KEY, [report, ...(await getReports())].slice(0, MAX))
  return report
}

/** Mark a report resolved or reopen it; null when there's no such report */
export async function setReportResolved(id: string, resolved: boolean): Promise<ProblemReport | null> {
  if (movieApiEnabled()) {
    if (!/^\d+$/.test(id)) return null
    try {
      return fromApi(await apiCall<ApiReport>('PUT', `/reports/${id}`, { resolved, resolvedBy: 'RuengFlix admin' }))
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null
      throw err
    }
  }
  const list = await getReports()
  const report = list.find(r => r.id === id)
  if (!report) return null
  report.resolved = resolved
  await localStore().setItem(KEY, list)
  return report
}
