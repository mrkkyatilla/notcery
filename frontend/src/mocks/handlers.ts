import { http, HttpResponse } from 'msw'

import type { components } from '@/shared/api/schema'

const API_BASE = 'http://localhost:8000/api/v1'

type HealthStatus = components['schemas']['HealthStatus']
type PublicConfig = components['schemas']['PublicConfig']
type User = components['schemas']['User']
type AuthResponse = components['schemas']['AuthResponse']
type TokenPair = components['schemas']['TokenPair']
type Workspace = components['schemas']['Workspace']
type Subject = components['schemas']['Subject']
type StudyEvent = components['schemas']['StudyEvent']
type StudyEventResponse = components['schemas']['StudyEventResponse']
type PlanVersion = components['schemas']['PlanVersion']
type Note = components['schemas']['Note']
type NoteSummary = components['schemas']['NoteSummary']
type ChatSession = components['schemas']['ChatSession']
type Document = components['schemas']['Document']
type UploadUrlResponse = components['schemas']['UploadUrlResponse']
type BillingSummary = components['schemas']['BillingSummary']
type RetrieveResponse = components['schemas']['RetrieveResponse']
type AsyncTaskAccepted = components['schemas']['AsyncTaskAccepted']
type AsyncTask = components['schemas']['AsyncTask']
type ChatMessage = components['schemas']['ChatMessage']
type ChatMessageResponse = components['schemas']['ChatMessageResponse']
type PlanGenerateRequest = components['schemas']['PlanGenerateRequest']

const healthOk: HealthStatus = {
  status: 'ok',
  checks: {
    database: { status: 'ok' },
    redis: { status: 'ok' },
    storage: { status: 'ok' },
  },
}

const publicConfig: PublicConfig = {
  locales: [
    { code: 'tr', label: 'Türkçe' },
    { code: 'en', label: 'English' },
  ],
  themes: [
    { code: 'light', label: 'Açık' },
    { code: 'dark', label: 'Koyu' },
    { code: 'system', label: 'Sistem' },
  ],
  default_locale: 'tr',
  default_theme: 'system',
  google_oauth: {
    enabled: false,
    client_id: '',
  },
  feature_flags: {
    ai_grounding: false,
  },
}

const mockUser: User = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@notcery.app',
  display_name: 'Demo User',
  locale: 'tr',
  theme: 'system',
  timezone: 'Europe/Istanbul',
  auth_provider: 'email',
  email_verified: true,
  onboarding_completed: true,
  study_preferences: {},
  social_accounts: [],
  created_at: new Date().toISOString(),
}

const tokens: TokenPair = {
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
  access_expires_in: 900,
}

let workspaces: Workspace[] = [
  {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'Demo Workspace',
    owner_id: mockUser.id,
    exam_date: null,
    created_at: new Date().toISOString(),
  },
]

let studyEvents: StudyEvent[] = []
let notes: Note[] = []
let documents: Document[] = []

const STORAGE_LIMIT_MB = 500

function storageUsedMb(): number {
  const bytes = documents.reduce((sum, d) => sum + (d.size_bytes ?? 0), 0)
  return Math.round((bytes / (1024 * 1024)) * 100) / 100
}

function effectiveDocumentStatus(doc: Document): Document['status'] {
  if (doc.status === 'failed') return 'failed'
  const age = Date.now() - new Date(doc.created_at ?? 0).getTime()
  if (age < 2000) return 'pending'
  if (age < 6000) return 'processing'
  return 'ready'
}

function documentWithStatus(doc: Document): Document {
  return { ...doc, status: effectiveDocumentStatus(doc) }
}

let planGenerationsThisWeek = 0
let chatMessagesToday = 0
const waitlistEmails = new Set<string>()

const asyncTasks = new Map<
  string,
  { createdAt: number; status: AsyncTask['status']; result?: AsyncTask['result']; error?: AsyncTask['error'] }
>()

const chatMessagesBySession = new Map<string, ChatMessage[]>()

function billingSummary(): BillingSummary {
  return {
    tier: 'free',
    status: 'active',
    limits: {
      storage_mb: STORAGE_LIMIT_MB,
      plan_generate_per_week: 5,
      chat_messages_per_day: 30,
    } as unknown as BillingSummary['limits'],
    usage: {
      storage_mb: storageUsedMb(),
      plan_generate_this_week: planGenerationsThisWeek,
      chat_messages_today: chatMessagesToday,
    } as unknown as BillingSummary['usage'],
  }
}

let subjects: Subject[] = [
  {
    id: '00000000-0000-4000-8000-000000000020',
    workspace_id: workspaces[0]!.id,
    name: 'Mathematics',
    difficulty: 3,
    weekly_target_hours: 5,
    color: '#6366f1',
  },
]

function authHeader(request: Request): boolean {
  return request.headers.get('Authorization') === `Bearer ${tokens.access}`
}

export const handlers = [
  http.get(`${API_BASE}/health`, () => HttpResponse.json(healthOk)),
  http.get(`${API_BASE}/config/public`, () => HttpResponse.json(publicConfig)),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string; display_name?: string }
    mockUser.email = body.email
    mockUser.display_name = body.display_name ?? ''
    mockUser.onboarding_completed = false
    const response: AuthResponse = { user: mockUser, tokens, is_new_user: true }
    return HttpResponse.json(response, { status: 201 })
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string }
    mockUser.email = body.email
    const response: AuthResponse = { user: mockUser, tokens }
    return HttpResponse.json(response)
  }),

  http.post(`${API_BASE}/auth/google`, () =>
    HttpResponse.json(
      {
        error: {
          code: 'GOOGLE_TOKEN_INVALID',
          message: 'Google OAuth disabled in MSW',
        },
      },
      { status: 401 },
    ),
  ),

  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refresh: string }
    if (body.refresh !== tokens.refresh) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid refresh' } },
        { status: 401 },
      )
    }
    return HttpResponse.json(tokens)
  }),

  http.post(`${API_BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API_BASE}/users/me`, ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    return HttpResponse.json(mockUser)
  }),

  http.patch(`${API_BASE}/users/me`, async ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const patch = (await request.json()) as Partial<User>
    Object.assign(mockUser, patch)
    return HttpResponse.json(mockUser)
  }),

  http.get(`${API_BASE}/workspaces`, ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ results: workspaces })
  }),

  http.post(`${API_BASE}/workspaces`, async ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as { name: string }
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: body.name,
      owner_id: mockUser.id,
      exam_date: null,
      created_at: new Date().toISOString(),
    }
    workspaces = [...workspaces, workspace]
    return HttpResponse.json(workspace, { status: 201 })
  }),

  http.get(`${API_BASE}/workspaces/:workspaceId/subjects`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const wsId = params.workspaceId as string
    return HttpResponse.json({
      results: subjects.filter((s) => s.workspace_id === wsId),
    })
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/subjects`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as {
      name: string
      difficulty: number
      color: string
    }
    const subject: Subject = {
      id: crypto.randomUUID(),
      workspace_id: params.workspaceId as string,
      name: body.name,
      difficulty: body.difficulty,
      color: body.color,
      weekly_target_hours: null,
    }
    subjects = [...subjects, subject]
    return HttpResponse.json(subject, { status: 201 })
  }),

  http.get(`${API_BASE}/workspaces/:workspaceId/events`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'from and to required' } },
        { status: 400 },
      )
    }
    const fromMs = new Date(from).getTime()
    const toMs = new Date(to).getTime()
    const wsId = params.workspaceId as string
    const results = studyEvents.filter(
      (e) =>
        e.workspace_id === wsId &&
        new Date(e.start_at).getTime() < toMs &&
        new Date(e.end_at).getTime() > fromMs,
    )
    return HttpResponse.json({ results })
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/events`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as StudyEvent & { subject_id?: string }
    const event: StudyEvent = {
      id: crypto.randomUUID(),
      workspace_id: params.workspaceId as string,
      subject_id: body.subject_id ?? null,
      plan_version_id: null,
      title: body.title,
      start_at: body.start_at,
      end_at: body.end_at,
      method: body.method,
      status: body.status ?? 'planned',
      user_feedback: null,
    }
    studyEvents = [...studyEvents, event]
    const response: StudyEventResponse = { ...event }
    return HttpResponse.json(response, { status: 201 })
  }),

  http.patch(`${API_BASE}/events/:eventId`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const patch = (await request.json()) as Partial<StudyEvent>
    const idx = studyEvents.findIndex((e) => e.id === params.eventId)
    if (idx < 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Not found' } },
        { status: 404 },
      )
    }
    studyEvents[idx] = { ...studyEvents[idx]!, ...patch }
    return HttpResponse.json(studyEvents[idx])
  }),

  http.delete(`${API_BASE}/events/:eventId`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    studyEvents = studyEvents.filter((e) => e.id !== params.eventId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/plans/save`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as {
      range_start: string
      range_end: string
    }
    const plan: PlanVersion = {
      id: crypto.randomUUID(),
      workspace_id: params.workspaceId as string,
      generated_by: 'user',
      is_active: false,
      range_start: body.range_start,
      range_end: body.range_end,
      event_count: studyEvents.length,
      created_at: new Date().toISOString(),
    }
    return HttpResponse.json(plan, { status: 201 })
  }),

  http.post(`${API_BASE}/plans/versions/:versionId/activate`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const plan: PlanVersion = {
      id: params.versionId as string,
      workspace_id: workspaces[0]!.id,
      generated_by: 'user',
      is_active: true,
      range_start: '2026-05-19',
      range_end: '2026-05-25',
      event_count: studyEvents.length,
      created_at: new Date().toISOString(),
    }
    return HttpResponse.json(plan)
  }),

  http.get(`${API_BASE}/workspaces/:workspaceId/notes`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.toLowerCase()
    const subjectId = url.searchParams.get('subject_id')
    const wsId = params.workspaceId as string
    let results = notes.filter((n) => n.workspace_id === wsId)
    if (subjectId) results = results.filter((n) => n.subject_id === subjectId)
    if (q) results = results.filter((n) => (n.title ?? '').toLowerCase().includes(q))
    const summaries: NoteSummary[] = results.map((n) => ({
      id: n.id,
      title: n.title,
      subject_id: n.subject_id,
      updated_at: n.updated_at,
    }))
    return HttpResponse.json({ results: summaries })
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/notes`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as {
      title?: string
      subject_id?: string
      content_json?: Record<string, unknown>
    }
    const note: Note = {
      id: crypto.randomUUID(),
      workspace_id: params.workspaceId as string,
      subject_id: body.subject_id ?? null,
      title: body.title ?? '',
      content_json: (body.content_json ?? { type: 'doc', content: [] }) as Note['content_json'],
      indexed_at: null,
      updated_at: new Date().toISOString(),
    }
    notes = [...notes, note]
    return HttpResponse.json(note, { status: 201 })
  }),

  http.get(`${API_BASE}/notes/:noteId`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const note = notes.find((n) => n.id === params.noteId)
    if (!note) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json(note)
  }),

  http.patch(`${API_BASE}/notes/:noteId`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const patch = (await request.json()) as Partial<Note>
    const idx = notes.findIndex((n) => n.id === params.noteId)
    if (idx < 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Not found' } },
        { status: 404 },
      )
    }
    notes[idx] = {
      ...notes[idx]!,
      ...patch,
      updated_at: new Date().toISOString(),
      indexed_at: patch.content_json ? null : notes[idx]!.indexed_at,
    }
    return HttpResponse.json(notes[idx])
  }),

  http.delete(`${API_BASE}/notes/:noteId`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    notes = notes.filter((n) => n.id !== params.noteId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/chat/sessions`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const session: ChatSession = {
      id: crypto.randomUUID(),
      workspace_id: params.workspaceId as string,
      created_at: new Date().toISOString(),
    }
    return HttpResponse.json(session, { status: 201 })
  }),

  http.get(`${API_BASE}/billing/me`, ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    return HttpResponse.json(billingSummary())
  }),

  http.put(`${API_BASE}/mock-storage/*`, () => new HttpResponse(null, { status: 200 })),

  http.post(`${API_BASE}/workspaces/:workspaceId/documents/upload-url`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as { filename: string; size_bytes: number }
    const usedMb = storageUsedMb()
    const extraMb = body.size_bytes / (1024 * 1024)
    if (usedMb + extraMb > STORAGE_LIMIT_MB) {
      return HttpResponse.json(
        {
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'Storage quota exceeded.',
            details: {
              metric: 'storage_bytes',
              limit_mb: STORAGE_LIMIT_MB,
              used_mb: usedMb,
            },
          },
        },
        { status: 403 },
      )
    }
    const fileKey = `mock/${params.workspaceId}/${crypto.randomUUID()}/${body.filename}`
    const response: UploadUrlResponse = {
      upload_url: `${API_BASE}/mock-storage/${encodeURIComponent(fileKey)}`,
      file_key: fileKey,
      expires_in: 900,
    }
    return HttpResponse.json(response)
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/documents`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as {
      file_key: string
      original_filename: string
      mime_type: string
      size_bytes: number
      subject_id?: string
    }
    const doc: Document = {
      id: crypto.randomUUID(),
      workspace_id: params.workspaceId as string,
      subject_id: body.subject_id ?? null,
      original_filename: body.original_filename,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    documents = [...documents, doc]
    return HttpResponse.json(documentWithStatus(doc), { status: 201 })
  }),

  http.get(`${API_BASE}/workspaces/:workspaceId/documents`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const wsId = params.workspaceId as string
    const results = documents
      .filter((d) => d.workspace_id === wsId)
      .map(documentWithStatus)
    return HttpResponse.json({ results })
  }),

  http.get(`${API_BASE}/documents/:documentId`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const doc = documents.find((d) => d.id === params.documentId)
    if (!doc) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Not found' } },
        { status: 404 },
      )
    }
    return HttpResponse.json(documentWithStatus(doc))
  }),

  http.delete(`${API_BASE}/documents/:documentId`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    documents = documents.filter((d) => d.id !== params.documentId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API_BASE}/billing/checkout`, ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    return HttpResponse.json(
      {
        checkout_url: 'https://example.com/mock-checkout',
        session_id: 'mock_cs',
      },
      { status: 201 },
    )
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/plans/generate`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const limits = billingSummary().limits as { plan_generate_per_week?: number }
    const usage = billingSummary().usage as { plan_generate_this_week?: number }
    if (
      limits.plan_generate_per_week != null &&
      (usage.plan_generate_this_week ?? 0) >= limits.plan_generate_per_week
    ) {
      return HttpResponse.json(
        {
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'Weekly AI plan limit reached.',
            details: {
              metric: 'plan_generate',
              limit: limits.plan_generate_per_week,
              used: usage.plan_generate_this_week,
            },
          },
        },
        { status: 403 },
      )
    }
    const body = (await request.json()) as PlanGenerateRequest
    const taskId = crypto.randomUUID()
    asyncTasks.set(taskId, { createdAt: Date.now(), status: 'pending' })
    planGenerationsThisWeek += 1

    const wsId = params.workspaceId as string
    const subject = subjects[0]
    setTimeout(() => {
      const planVersionId = crypto.randomUUID()
      const start = new Date()
      start.setHours(10, 0, 0, 0)
      const end = new Date(start)
      end.setHours(11, 30, 0, 0)
      studyEvents = [
        ...studyEvents,
        {
          id: crypto.randomUUID(),
          workspace_id: wsId,
          subject_id: subject?.id ?? null,
          title: 'AI: Review session',
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          method: 'active_recall',
          status: 'planned',
        },
      ]
      asyncTasks.set(taskId, {
        createdAt: Date.now(),
        status: 'success',
        result: {
          plan_version_id: planVersionId,
          adjustments: ['Extra time added for difficult topics from your notes.'],
          summary: `Plan for ${body.range_start} – ${body.range_end}`,
        } as unknown as AsyncTask['result'],
      })
    }, 2500)

    const accepted: AsyncTaskAccepted = {
      task_id: taskId,
      status: 'pending',
      poll_url: `${API_BASE}/tasks/${taskId}`,
    }
    return HttpResponse.json(accepted, { status: 202 })
  }),

  http.get(`${API_BASE}/tasks/:taskId`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const stored = asyncTasks.get(params.taskId as string)
    if (!stored) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Not found' } },
        { status: 404 },
      )
    }
    const task: AsyncTask = {
      task_id: params.taskId as string,
      status: stored.status,
      result: stored.result ?? null,
      error: stored.error,
    }
    return HttpResponse.json(task)
  }),

  http.post(`${API_BASE}/tasks/:taskId/retry`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const taskId = params.taskId as string
    asyncTasks.set(taskId, { createdAt: Date.now(), status: 'pending' })
    setTimeout(() => {
      asyncTasks.set(taskId, {
        createdAt: Date.now(),
        status: 'success',
        result: {
          plan_version_id: crypto.randomUUID(),
          adjustments: [],
        } as unknown as AsyncTask['result'],
      })
    }, 2000)
    return HttpResponse.json({
      task_id: taskId,
      status: 'pending',
    } satisfies AsyncTask)
  }),

  http.get(`${API_BASE}/chat/sessions/:sessionId/messages`, ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const sessionId = params.sessionId as string
    return HttpResponse.json({ results: chatMessagesBySession.get(sessionId) ?? [] })
  }),

  http.post(`${API_BASE}/chat/sessions/:sessionId/messages`, async ({ request, params }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const limits = billingSummary().limits as { chat_messages_per_day?: number }
    if (
      limits.chat_messages_per_day != null &&
      chatMessagesToday >= limits.chat_messages_per_day
    ) {
      return HttpResponse.json(
        {
          error: {
            code: 'QUOTA_EXCEEDED',
            message: 'Daily chat message limit reached.',
            details: {
              metric: 'chat_message',
              limit: limits.chat_messages_per_day,
              used: chatMessagesToday,
            },
          },
        },
        { status: 403 },
      )
    }

    const sessionId = params.sessionId as string
    const body = (await request.json()) as { content: string; context?: { note_id?: string } }
    const history = chatMessagesBySession.get(sessionId) ?? []
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: body.content,
      created_at: new Date().toISOString(),
    }
    chatMessagesToday += 1
    const noteId = body.context?.note_id ?? notes[0]?.id ?? null
    const assistantId = crypto.randomUUID()
    const response: ChatMessageResponse = {
      message: {
        id: assistantId,
        role: 'assistant',
        content: `**Mock answer** for: ${body.content}\n\n- Based on your materials\n- Try spaced repetition`,
      },
      citations: [
        {
          type: 'chunk',
          chunk_id: crypto.randomUUID(),
          source_type: noteId ? 'note' : 'document',
          note_id: noteId,
          document_id: noteId ? null : documents[0]?.id ?? null,
          label: noteId ? 'Mock note' : documents[0]?.original_filename ?? 'sample.pdf',
          excerpt: '',
        },
      ],
    }
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: response.message?.content ?? '',
      citations: response.citations,
      created_at: new Date().toISOString(),
    }
    chatMessagesBySession.set(sessionId, [...history, userMsg, assistantMsg])
    return HttpResponse.json(response)
  }),

  http.post(`${API_BASE}/workspaces/:workspaceId/retrieve`, async ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as { query: string }
    const response: RetrieveResponse = {
      query: body.query,
      results: [
        {
          id: crypto.randomUUID(),
          text: `Mock chunk for: ${body.query}`,
          excerpt: `Mock excerpt for "${body.query}"`,
          score: 0.92,
          source_type: 'document',
        },
      ],
    }
    return HttpResponse.json(response)
  }),

  http.post(`${API_BASE}/billing/portal`, ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ portal_url: 'https://example.com/mock-portal' })
  }),

  http.post(`${API_BASE}/waitlist`, async ({ request }) => {
    const body = (await request.json()) as { email: string }
    const email = body.email?.trim().toLowerCase()
    if (!email) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email required' } },
        { status: 400 },
      )
    }
    if (waitlistEmails.has(email)) {
      return HttpResponse.json({ created: false }, { status: 200 })
    }
    waitlistEmails.add(email)
    return HttpResponse.json({ created: true }, { status: 201 })
  }),

  http.post(`${API_BASE}/feedback/ai`, ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/users/me/export`, ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({
      user: mockUser,
      exported_at: new Date().toISOString(),
    })
  }),

  http.delete(`${API_BASE}/users/me`, async ({ request }) => {
    if (!authHeader(request)) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as { confirm?: string }
    if (body.confirm !== 'DELETE') {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Confirmation required' } },
        { status: 400 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
