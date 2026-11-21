import { MAX_UPLOAD_BYTES, validateUpload } from './upload'
test('validates extension, empty content and exact size boundaries before upload', () => {
  expect(validateUpload(new File(['[]'], 'events.json'))).toBe('')
  expect(validateUpload(new File(['print(1)'], 'events.py'))).toContain('.csv or .json')
  expect(validateUpload(new File([], 'events.json'))).toContain('empty')
  expect(validateUpload(new File([new Uint8Array(MAX_UPLOAD_BYTES)], 'events.csv'))).toBe('')
  expect(validateUpload(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'events.csv'))).toContain('2 MiB')
})
