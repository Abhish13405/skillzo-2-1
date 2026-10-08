// ─── IndexedDB Storage for Ultra-Compressed Lightweight Interview Recordings ───

const DB_NAME = 'skillzo_recordings_db'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

/**
 * Open (or create) IndexedDB database
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('sessionId', 'sessionId', { unique: false })
      }
    }

    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Format bytes into human-readable KB / MB
 */
export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 KB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Save a newly recorded video or audio clip (ultra-low space storage)
 */
export const saveRecording = async ({
  sessionId,
  jobRole,
  difficulty,
  mode,
  questionNumber,
  questionText,
  blob,
  durationSeconds,
}) => {
  if (!blob || blob.size === 0) return null

  try {
    const db = await openDB()
    const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const record = {
      id,
      sessionId: String(sessionId || 'practice'),
      jobRole: jobRole || 'Mock Interview',
      difficulty: difficulty || 'Practice',
      mode: mode || 'video', // 'video' or 'audio'
      questionNumber: questionNumber || 1,
      questionText: questionText || '',
      blob,
      sizeBytes: blob.size,
      mimeType: blob.type || (mode === 'audio' ? 'audio/webm' : 'video/webm'),
      durationSeconds: durationSeconds || 0,
      createdAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.add(record)

      req.onsuccess = () => resolve(record)
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Failed to save recording to IndexedDB:', err)
    return null
  }
}

/**
 * Get all recordings, newest first
 */
export const getAllRecordings = async () => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => {
        const list = req.result || []
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        resolve(list)
      }
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Failed to fetch recordings from IndexedDB:', err)
    return []
  }
}

/**
 * Delete a specific recording by ID
 */
export const deleteRecording = async (id) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)

      req.onsuccess = () => resolve(true)
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Failed to delete recording:', err)
    return false
  }
}

/**
 * Clear all recordings
 */
export const clearAllRecordings = async () => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()

      req.onsuccess = () => resolve(true)
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Failed to clear recordings:', err)
    return false
  }
}

/**
 * Calculate total storage used by all recordings
 */
export const getTotalStorageUsed = async () => {
  const all = await getAllRecordings()
  const total = all.reduce((sum, r) => sum + (r.sizeBytes || 0), 0)
  return {
    totalBytes: total,
    formatted: formatBytes(total),
    count: all.length,
  }
}
