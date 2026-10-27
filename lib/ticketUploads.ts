import { authHeaders } from '@/lib/authHeaders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface UploadedTicketFile {
  id: string;
  kind: string;
  previewUrl: string;
  message: string;
}

function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    return body.message;
  }
  return fallback;
}

export function uploadTicketFile(
  file: File,
  options: { kind?: 'receipt'; onProgress: (percent: number) => void }
): { promise: Promise<UploadedTicketFile>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadedTicketFile>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    if (options.kind) form.append('kind', options.kind);
    xhr.open('POST', `${API_URL}/api/tickets/uploads`);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onerror = () => reject(new Error('Could not store this file'));
    xhr.onabort = () => reject(new Error('Could not store this file'));
    xhr.onload = () => {
      let body: unknown = {};
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        body = {};
      }
      const message = messageFromBody(body, 'Could not store this file');
      const data = body && typeof body === 'object' && 'data' in body ? (body as { data?: UploadedTicketFile }).data : undefined;
      const success = body && typeof body === 'object' && 'success' in body ? (body as { success?: boolean }).success : true;
      if (xhr.status < 200 || xhr.status >= 300 || success === false || !data?.id) {
        reject(new Error(message));
        return;
      }
      resolve({ ...data, message });
    };
    authHeaders()
      .then((headers) => {
        if (headers.Authorization) xhr.setRequestHeader('Authorization', headers.Authorization);
        xhr.send(form);
      })
      .catch(() => reject(new Error('Could not store this file')));
  });
  return { promise, abort: () => xhr.abort() };
}
