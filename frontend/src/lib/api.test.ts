import { Api, ApiError } from './api'

afterEach(() => vi.unstubAllGlobals())
test('sends workspace key only as a header and preserves multipart boundaries', async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify([])))
  vi.stubGlobal('fetch', mock)
  const api = new Api('memory-key', '')
  const form = new FormData()
  form.append('file', new Blob(['[]']), 'events.json')
  await api.request('/api/datasets/upload', { method: 'POST', body: form })
  const [path, options] = mock.mock.calls[0]
  expect(path).not.toContain('memory-key')
  expect(options.headers.get('X-API-Key')).toBe('memory-key')
  expect(options.headers.has('Content-Type')).toBe(false)
})
test('surfaces API failures without treating them as successful data', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Workspace key required' }), { status: 401 }),
      ),
  )
  await expect(new Api().request('/api/datasets')).rejects.toBeInstanceOf(ApiError)
})
test('rejects insecure remote endpoints', () => {
  expect(() => new Api('', 'http://external.example')).toThrow('HTTPS')
})
