/**
 * `fetch` gives no reliable cross-browser signal for upload progress, so a
 * chat attachment or voice note - the two uploads big enough for a stalled
 * bar to matter - goes through `XMLHttpRequest` instead, purely for its
 * `upload.onprogress` event.
 */
export function uploadFileWithProgress<T = { key: string; url: string; contentType: string }>(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new Error((body as { error?: string } | null)?.error ?? "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(formData);
  });
}
