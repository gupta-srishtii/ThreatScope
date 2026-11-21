export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
export function validateUpload(file: File): string {
  if (!/\.(csv|json)$/i.test(file.name)) return 'Choose a .csv or .json file.'
  if (!file.size) return 'The selected file is empty.'
  if (file.size > MAX_UPLOAD_BYTES) return 'The file exceeds the 2 MiB upload limit.'
  return ''
}
