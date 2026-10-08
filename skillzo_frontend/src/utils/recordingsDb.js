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
  userId,
  userEmail,
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
      userId: userId || null,
      userEmail: userEmail ? userEmail.toLowerCase() : null,
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
 * Get recordings filtered by logged-in user (or all if showAll is true), newest first
 */
export const getAllRecordings = async (filterUser = null, showAll = false) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => {
        let list = req.result || []
        if (filterUser && !showAll) {
          const uid = filterUser.id
          const uemail = (filterUser.email || '').toLowerCase()
          list = list.filter((r) => {
            // Match by userId or userEmail
            if (r.userId && uid && String(r.userId) === String(uid)) return true
            if (r.userEmail && uemail && r.userEmail.toLowerCase() === uemail) return true
            // Legacy recording created before user tagging (only show if email matches current candidate or no user tagged)
            if (!r.userId && !r.userEmail) return true
            return false
          })
        }
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
 * Clear all recordings for a specific user
 */
export const clearAllRecordings = async (filterUser = null) => {
  try {
    const db = await openDB()
    if (!filterUser) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.clear()
        req.onsuccess = () => resolve(true)
        req.onerror = (e) => reject(e.target.error)
      })
    }

    // Delete only the user's recordings
    const userRecs = await getAllRecordings(filterUser, false)
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const rec of userRecs) {
      store.delete(rec.id)
    }
    return true
  } catch (err) {
    console.error('Failed to clear recordings:', err)
    return false
  }
}

/**
 * Calculate total storage used by recordings of the user or all if showAll is true
 */
export const getTotalStorageUsed = async (filterUser = null, showAll = false) => {
  const all = await getAllRecordings(filterUser, showAll)
  const total = all.reduce((sum, r) => sum + (r.sizeBytes || 0), 0)
  return {
    totalBytes: total,
    formatted: formatBytes(total),
    count: all.length,
  }
}

