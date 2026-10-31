'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AgreementFilePicker, type AgreementFileProgress } from '@/components/vlb/AgreementFilePicker';
import { ErrorState, LoadingMessage, SuccessPanel } from '@/components/ui-states';
import { apiRequest } from '@/lib/api';

type UploadPage = {
  full_name: string;
  plan_name: string;
  blank_agreement: { title: string; url: string } | null;
  files: Array<{ id: string; file_name: string; created_at: string }>;
};

function AgreementUploadInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [page, setPage] = useState<UploadPage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AgreementFileProgress[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = async () => {
    const result = await apiRequest<UploadPage>(`/api/vlb/agreement-upload?token=${encodeURIComponent(token)}`);
    if (!result.ok) {
      setFailed(result.message);
      return;
    }
    setPage(result.data);
    setFailed(null);
  };

  useEffect(() => {
    if (!token) {
      setFailed('This upload link is not valid.');
      return;
    }
    void load();
  }, [token]);

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!files.length) {
      setFileError('Choose a file.');
      return;
    }
    setBusy(true);
    setFileError(null);
    setProgress(files.map((file) => ({ name: file.name, status: 'uploading', percent: 40 })));
    try {
      const body = new FormData();
      body.append('token', token);
      for (const file of files) body.append('files', file);
      const result = await apiRequest('/api/vlb/agreement-upload', { method: 'POST', body });
      if (!result.ok) {
        setFileError(result.fields?.files || result.message);
        setProgress(files.map((file) => ({ name: file.name, status: 'error', message: result.message })));
        return;
      }
      setProgress(files.map((file) => ({ name: file.name, status: 'done' })));
      setFiles([]);
      setDone(true);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (failed && !page) {
    return <ErrorState title="This upload link is not valid" description={failed} />;
  }
  if (!page) return <LoadingMessage label="Loading your upload page" />;
  if (done) {
    return (
      <SuccessPanel
        title="Thank you. We've received your signed agreement."
        description="You can close this page. We will contact you when we have checked the file."
      />
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Upload your signed agreement</h1>
        <p className="mt-2 text-sm text-[#3A3A3A]">{page.full_name} · {page.plan_name}</p>
      </div>
      {page.blank_agreement?.url ? (
        <a href={page.blank_agreement.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-medium text-[#FF7A19]">
          Download the blank agreement
        </a>
      ) : (
        <p className="text-sm text-[#3A3A3A]">The blank agreement is not available right now. Contact VENTECH if you need a copy.</p>
      )}
      {page.files.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-[#1A1A1A]">Already uploaded</h2>
          <ul className="mt-2 space-y-1 text-sm text-[#3A3A3A]">
            {page.files.map((file) => (
              <li key={file.id} className="truncate">{file.file_name}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={upload}>
        <AgreementFilePicker files={files} onFiles={setFiles} error={fileError} progress={progress} disabled={busy} />
        <Button type="submit" disabled={busy || files.length === 0} className="w-full sm:w-auto">
          {busy ? 'Working...' : 'Upload'}
        </Button>
      </form>
    </div>
  );
}

export default function AgreementUploadPage() {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <Suspense fallback={<LoadingMessage label="Loading your upload page" />}>
        <AgreementUploadInner />
      </Suspense>
    </main>
  );
}
