export type LabIndexStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type LabFileKind = 'upload' | 'artifact' | 'import'
export type LabOutputMode = 'free' | 'risk_matrix' | 'comparison_table'

export type LabFolder = {
  id: string
  workspace_id?: string
  parent_id?: string | null
  name: string
  path: string
  sort_order?: number
}

export type LabFile = {
  id: string
  workspace_id?: string
  folder_id?: string | null
  name: string
  mime_type?: string
  extension?: string
  size_bytes?: number
  index_status?: LabIndexStatus
  error_message?: string
  kind?: LabFileKind
  source_session_id?: string | null
  created_at?: string
}

export type LabSession = {
  id: string
  workspace_id?: string
  title?: string
  active_file_ids?: string[]
  settings?: {
    output_mode?: LabOutputMode
    use_rag?: boolean
  }
}

export type LabCitation = {
  type?: string
  chunk_id?: string
  lab_file_id?: string
  label?: string
  excerpt?: string
}

export type LabMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: LabCitation[]
  structured_result?: Record<string, unknown> | null
  created_at?: string
}

export type LabMessageCreate = {
  content: string
  context?: {
    use_rag?: boolean
    output_mode?: LabOutputMode
    active_file_ids?: string[]
  }
}

export type LabMessageResponse = {
  message: { id: string; role: string; content: string }
  citations?: LabCitation[]
  structured_result?: Record<string, unknown> | null
  artifact_file?: { id: string; name: string }
}

export type UploadUrlRequest = {
  filename: string
  mime_type?: string
  size_bytes: number
  folder_id?: string
}

export type UploadUrlResponse = {
  upload_url: string
  file_key: string
  expires_in: number
  mime_type?: string
}

export type LabFileCreate = {
  file_key: string
  original_filename: string
  mime_type: string
  size_bytes: number
  folder_id?: string
}
