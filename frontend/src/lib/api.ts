import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export interface Photo {
  id: number
  file_name: string
  file_path: string
  is_video: boolean
  thumbnail_small: string | null
  thumbnail_medium: string | null
  thumbnail_large: string | null
  width: number | null
  height: number | null
  date_taken: string | null
  location_name: string | null
  city: string | null
  country: string | null
  is_processed: boolean
}

export interface PhotoDetail extends Photo {
  file_size: number | null
  mime_type: string | null
  duration_seconds: number | null
  latitude: number | null
  longitude: number | null
  camera_make: string | null
  camera_model: string | null
  date_imported: string | null
  tags: Tag[]
  people: Person[]
  pets: Pet[]
}

export interface Tag {
  id: number
  name: string
  category: string | null
  photo_count?: number
}

export interface Person {
  id: number
  name: string | null
  is_named: boolean
  photo_count: number
  representative_face_id: number | null
}

export interface Pet {
  id: number
  name: string | null
  species: string | null
  is_named: boolean
  photo_count: number
}

export interface SearchQuery {
  text?: string
  people_ids?: number[]
  pet_ids?: number[]
  tag_names?: string[]
  location?: string
  date_from?: string
  date_to?: string
  is_video?: boolean
  limit?: number
  offset?: number
}

export interface ImportSource {
  id: number
  name: string
  source_type: string
  source_path: string | null
  date_imported: string
  photo_count: number
  status: string
}

export interface LibraryStats {
  total_photos: number
  total_videos: number
  total_people: number
  total_pets: number
  total_tags: number
  processed_count: number
  unprocessed_count: number
  storage_size_bytes: number
}

export interface ProcessingStatus {
  queue_length: number
  processing: number
  completed: number
  failed: number
}

// Photos API
export const photosApi = {
  list: async (limit = 50, offset = 0, isVideo?: boolean) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (isVideo !== undefined) params.append('is_video', String(isVideo))
    const { data } = await api.get<Photo[]>(`/photos/?${params}`)
    return data
  },
  
  get: async (id: number) => {
    const { data } = await api.get<PhotoDetail>(`/photos/${id}`)
    return data
  },
  
  getThumbnailUrl: (id: number, size: 'small' | 'medium' | 'large' = 'medium') => {
    return `/api/photos/${id}/thumbnail/${size}`
  },
  
  getFileUrl: (id: number) => {
    return `/api/photos/${id}/file`
  },
  
  delete: async (id: number, deleteFile = false) => {
    const { data } = await api.delete(`/photos/${id}?delete_file=${deleteFile}`)
    return data
  },
}

// Search API
export const searchApi = {
  search: async (query: SearchQuery) => {
    const { data } = await api.post<Photo[]>('/search/', query)
    return data
  },
  
  semantic: async (q: string, limit = 50, offset = 0) => {
    const { data } = await api.get<Photo[]>(`/search/semantic?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`)
    return data
  },
  
  suggestions: async (q: string) => {
    const { data } = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`)
    return data
  },
}

// People API
export const peopleApi = {
  list: async (namedOnly = false, limit = 50): Promise<Person[]> => {
    const response = await api.get('/people/', { params: { named_only: namedOnly, limit } })
    return response.data
  },
  get: async (id: number): Promise<Person> => {
    const response = await api.get(`/people/${id}`)
    return response.data
  },
  update: async (id: number, name: string): Promise<Person> => {
    const response = await api.put(`/people/${id}`, { name })
    return response.data
  },
  getPhotos: async (id: number, limit = 50): Promise<Photo[]> => {
    const response = await api.get(`/people/${id}/photos`, { params: { limit } })
    return response.data
  },
  merge: async (id: number, otherId: number): Promise<void> => {
    await api.post(`/people/${id}/merge/${otherId}`)
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/people/${id}`)
  },
  getFaceThumbnailUrl: (personId: number, size = 128): string => {
    return `${api.defaults.baseURL}/people/${personId}/face?size=${size}`
  },
}

// Import API
export const importApi = {
  start: async (sourcePath: string, sourceType = 'folder', name?: string) => {
    const { data } = await api.post<ImportSource>('/import/', { source_path: sourcePath, source_type: sourceType, name })
    return data
  },
  
  listSources: async () => {
    const { data } = await api.get<ImportSource[]>('/import/sources')
    return data
  },
  
  getProgress: async (sourceId: number) => {
    const { data } = await api.get(`/import/sources/${sourceId}/progress`)
    return data
  },
}

export interface ProcessingProgress {
  is_running: boolean
  current_photo: string | null
  current_step: string
  processed: number
  total: number
  speed: number
  percent: number
}

// Processing API
export const processingApi = {
  start: async (batchSize = 10) => {
    const { data } = await api.post(`/processing/start?batch_size=${batchSize}`)
    return data
  },
  
  startContinuous: async (maxItems?: number) => {
    const params = maxItems ? `?max_items=${maxItems}` : ''
    const { data } = await api.post(`/processing/start-continuous${params}`)
    return data
  },
  
  stop: async () => {
    const { data } = await api.post('/processing/stop')
    return data
  },
  
  getProgress: async () => {
    const { data } = await api.get<ProcessingProgress>('/processing/progress')
    return data
  },
  
  getStatus: async () => {
    const { data } = await api.get<ProcessingStatus>('/processing/status')
    return data
  },
  
  getStats: async () => {
    const { data } = await api.get<LibraryStats>('/processing/stats')
    return data
  },
  
  queueAll: async () => {
    const { data } = await api.post('/processing/queue-all')
    return data
  },
}

// Tags API
export const tagsApi = {
  list: async () => {
    const { data } = await api.get<Tag[]>('/tags/')
    return data
  },
}

// Album interfaces
export interface Album {
  id: number
  name: string
  description: string | null
  cover_photo_id: number | null
  created_at: string
  updated_at: string
  photo_count: number
}

export interface AlbumDetail extends Album {
  photos: Photo[]
}

// Albums API
export const albumsApi = {
  list: async (limit = 50, offset = 0) => {
    const { data } = await api.get<Album[]>(`/albums/?limit=${limit}&offset=${offset}`)
    return data
  },
  
  get: async (id: number) => {
    const { data } = await api.get<AlbumDetail>(`/albums/${id}`)
    return data
  },
  
  create: async (name: string, description?: string) => {
    const { data } = await api.post<Album>('/albums/', { name, description })
    return data
  },
  
  update: async (id: number, updates: { name?: string; description?: string; cover_photo_id?: number }) => {
    const { data } = await api.put<Album>(`/albums/${id}`, updates)
    return data
  },
  
  delete: async (id: number) => {
    const { data } = await api.delete(`/albums/${id}`)
    return data
  },
  
  addPhotos: async (albumId: number, photoIds: number[]) => {
    const { data } = await api.post(`/albums/${albumId}/photos`, { photo_ids: photoIds })
    return data
  },
  
  removePhoto: async (albumId: number, photoId: number) => {
    const { data } = await api.delete(`/albums/${albumId}/photos/${photoId}`)
    return data
  },
}

export default api
