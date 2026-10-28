// Documents made with the admin tools, kept in this browser's IndexedDB so
// they can be downloaded again later. Nothing here leaves the browser.

export type ToolHistoryItem = {
  id: string
  originalName: string
  downloadName: string
  size: number
  uploadedAt: string
  document: Blob
}

export const LETTERHEAD_HISTORY_STORE = 'letterhead-documents'
export const MEAL_PLAN_HISTORY_STORE = 'meal-plan-documents'
export const STAMP_HISTORY_STORE = 'stamped-documents'

const HISTORY_DB_NAME = 'fxmed-admin-tools'
const HISTORY_DB_VERSION = 5
const STORES = [LETTERHEAD_HISTORY_STORE, MEAL_PLAN_HISTORY_STORE, STAMP_HISTORY_STORE]

function openHistoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest) {
  const db = await openHistoryDb()
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(storeName, mode).objectStore(storeName))
    request.onsuccess = () => {
      resolve(request.result as T)
      db.close()
    }
    request.onerror = () => {
      reject(request.error)
      db.close()
    }
  })
}

/** Newest first. */
export async function getStoredHistory(storeName: string) {
  const items = await withStore<ToolHistoryItem[]>(storeName, 'readonly', store => store.getAll())
  return items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
}

export async function saveHistoryItem(storeName: string, item: ToolHistoryItem) {
  await withStore(storeName, 'readwrite', store => store.put(item))
}

export async function deleteHistoryItem(storeName: string, id: string) {
  await withStore(storeName, 'readwrite', store => store.delete(id))
}
