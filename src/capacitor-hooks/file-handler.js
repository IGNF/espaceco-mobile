import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { CommunityDevice } from '@capacitor-community/device';
import { getDeviceOs } from './device-helper';

const PREFIX_MAP = {
  FILE: Directory.Data,
  DATA: Directory.Data,
  CACHE: Directory.Cache,
  TMP: Directory.Data,
  SDFILE: Directory.Data,
  SDCACHE: Directory.Cache,
  SD: Directory.External,
  DOCUMENTS: Directory.Documents,
  LIBRARY: Directory.Library,
  EXTERNAL: Directory.External,
  EXTERNAL_STORAGE: Directory.ExternalStorage,
  EXTERNALCACHE: Directory.ExternalCache,
  EXTERNAL_CACHE: Directory.ExternalCache,
  LIBRARY_NO_CLOUD: Directory.LibraryNoCloud,
  TEMPORARY: Directory.Temporary
}

function trimSlashes(value = '') {
  return value.replace(/^\/+/, '').replace(/\/+$/, '')
}

function joinPath(parent = '', child = '') {
  const cleanParent = trimSlashes(parent)
  const cleanChild = trimSlashes(child)
  if (!cleanParent) return cleanChild
  if (!cleanChild) return cleanParent
  return `${cleanParent}/${cleanChild}`
}

function normalizePath(rawPath = '') {
  const sanitized = trimSlashes(String(rawPath || '')).replace(/\\/g, '/')
  if (!sanitized) {
    return { path: '', directory: Directory.Data }
  }
  const segments = sanitized.split('/')
  const prefix = segments[0] ? segments[0].toUpperCase() : ''
  if (PREFIX_MAP[prefix]) {
    segments.shift()
    return {
      path: trimSlashes(segments.join('/')),
      directory: PREFIX_MAP[prefix]
    }
  }
  return { path: sanitized, directory: Directory.Data }
}

function isMissingError(error) {
  if (!error) return false
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : ''
  const code = typeof error.code === 'string' ? error.code.toLowerCase() : ''
  return message.includes('does not exist') || message.includes('not found') || code === 'eexist' || code === 'enoent'
}

function safeReaddir(rawPath) {
  const { path, directory } = normalizePath(rawPath)
  return Filesystem.readdir({ path, directory })
    .then(({ files }) => {
      return (files || []).map(entry => {
        const fullPath = joinPath(path, entry.name)
        return {
          name: entry.name,
          type: entry.type,
          size: typeof entry.size === 'number' ? entry.size : undefined,
          mtime: entry.mtime,
          uri: entry.uri,
          fullPath,
          isFile: entry.type === 'file'
        }
      })
    })
    .catch(err => {
      if (!isMissingError(err)) {
        console.warn('[filesystem] readdir failed', rawPath, err)
      }
      return []
    })
}

function safeStatSize(rawPath) {
  const { path, directory } = normalizePath(rawPath)
  return Filesystem.stat({ path, directory })
    .then(result => {
      if (typeof result.size === 'number') return result.size
      return 0
    })
    .catch(err => {
      if (!isMissingError(err)) {
        console.warn('[filesystem] stat failed', rawPath, err)
      }
      return 0
    })
}

function getFileEntrySize(entry) {
  if (!entry || !entry.isFile) return Promise.resolve(0)
  if (typeof entry.size === 'number') return Promise.resolve(entry.size)
  return safeStatSize(entry.fullPath)
}

function sumFileEntries(entries) {
  if (!entries || !entries.length) {
    return Promise.resolve({ size: 0, fileCount: 0 })
  }
  return Promise.all(entries.map(getFileEntrySize)).then(sizes => {
    const size = sizes.reduce((acc, value) => acc + value, 0)
    return { size, fileCount: entries.length }
  })
}

export function getDirectoryUsage(rawPath) {
  return safeReaddir(rawPath).then(entries => {
    if (!entries.length) {
      return { size: 0, fileCount: 0 }
    }
    const files = entries.filter(entry => entry.isFile)
    const directories = entries.filter(entry => entry.type === 'directory')
    return Promise.all([
      sumFileEntries(files),
      Promise.all(directories.map(dir => getDirectoryUsage(dir.fullPath)))
    ]).then(([fileStats, directoryStats]) => {
      const directoriesSize = (directoryStats || []).reduce((acc, stats) => acc + stats.size, 0)
      const directoriesCount = (directoryStats || []).reduce((acc, stats) => acc + stats.fileCount, 0)
      return {
        size: fileStats.size + directoriesSize,
        fileCount: fileStats.fileCount + directoriesCount
      }
    })
  })
}

export function getDirectoryChildrenUsage(rawPath) {
  return safeReaddir(rawPath).then(entries => {
    if (!entries.length) {
      return { directories: [], rootFiles: { size: 0, fileCount: 0 } }
    }
    const files = entries.filter(entry => entry.isFile)
    const directories = entries.filter(entry => entry.type === 'directory')
    return Promise.all([
      sumFileEntries(files),
      Promise.all(directories.map(dir => {
        return getDirectoryUsage(dir.fullPath).then(stats => ({
          name: dir.name,
          path: dir.fullPath,
          size: stats.size,
          fileCount: stats.fileCount
        }))
      }))
    ]).then(([rootFiles, directoriesStats]) => ({ directories: directoriesStats, rootFiles }))
  })
}

function queryNavigatorStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    return navigator.storage.estimate().then(result => {
      const quota = typeof result.quota === 'number' ? result.quota : null
      const usage = typeof result.usage === 'number' ? result.usage : null
      if (quota != null && usage != null) {
        return Math.max(quota - usage, 0)
      }
      return null
    })
  }
  if (typeof window !== 'undefined') {
    const storage = window.webkitTemporaryStorage || window.webkitPersistentStorage
    if (storage && typeof storage.queryUsageAndQuota === 'function') {
      return new Promise(resolve => {
        storage.queryUsageAndQuota(
          function success(usage, quota) {
            if (typeof quota === 'number' && typeof usage === 'number') {
              resolve(Math.max(quota - usage, 0))
            } else {
              resolve(null)
            }
          },
          function error() {
            resolve(null)
          }
        )
      })
    }
  }
  return Promise.resolve(null)
}

/**
 * iOS does not allow to get the free disk space (unless we create a privacy manifest file)
 * So we fetch this value for Android only
 * @returns {Promise<number | null>}
 */
export function getFreeDiskSpaceBytes() {
  if (getDeviceOs() === 'android') {
    return CommunityDevice.getInfo().then(deviceInfo => {
      console.log('info', deviceInfo)
      return deviceInfo.realDiskFree
    })
  }
  return queryNavigatorStorage()
}

export function listDirectoryEntries(rawPath) {
  return safeReaddir(rawPath)
}

function arrayBufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function toBase64Data(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return arrayBufferToBase64(data)
  if (data instanceof Uint8Array) return arrayBufferToBase64(data)
  if (ArrayBuffer.isView(data)) return arrayBufferToBase64(new Uint8Array(data.buffer))
  throw new Error('writeBinaryFile expects a string or ArrayBuffer-like object')
}

export function writeBinaryFile(rawPath, data) {
  const { path, directory } = normalizePath(rawPath)
  const payload = toBase64Data(data)
  return Filesystem.writeFile({ path, data: payload, directory, encoding: Encoding.BASE64, recursive: true })
}
