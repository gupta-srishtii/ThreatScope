export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export class Api {
  constructor(
    private key = '',
    private base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, ''),
  ) {
    if (base) {
      const url = new URL(base)
      if (
        url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
      ) {
        throw new Error('The API endpoint must use HTTPS, or HTTP on loopback for development.')
      }
    }
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(path, options)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    if (!path.startsWith('/api/')) throw new Error('Invalid API path')
    const headers = new Headers(options.headers)
    if (this.key) headers.set('X-API-Key', this.key)
    if (options.body && !(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json')
    const timeout = AbortSignal.timeout(30000)
    const response = await fetch(this.base + path, {
      ...options,
      headers,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const message =
        typeof body?.detail === 'string'
          ? body.detail
          : `Request failed (${response.status}). Please retry.`
      throw new ApiError(response.status, message)
    }
    return response
  }

  async download(dataset: string, format: 'json' | 'csv') {
    const response = await this.fetch(
      `/api/datasets/${encodeURIComponent(dataset)}/report?format=${format}`,
    )
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `threatscope-${dataset}.${format}`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
