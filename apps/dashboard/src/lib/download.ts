export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadIncidentExport(files: {
  json: string;
  html: string;
  filename: string;
}): void {
  downloadBlob(`${files.filename}.json`, files.json, 'application/json');
  downloadBlob(`${files.filename}.html`, files.html, 'text/html');
}
