'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import toast from 'react-hot-toast';
import { authHeaders } from '@/lib/authHeaders';
import { apiMessage } from '@/lib/contentAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function youtubeEmbed(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] || '';
      else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] || '';
      else id = url.searchParams.get('v') || '';
    }
    id = id.split(/[?&#]/)[0];
    if (!/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium sm:text-sm ${
        active ? 'bg-[#FF7A19] text-white' : 'text-[#1A1A1A] hover:bg-gray-100'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

function Toolbar({ editor, compact }: { editor: Editor; compact?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const addYoutube = () => {
    const url = window.prompt('Paste a YouTube URL');
    if (url === null) return;
    const embed = youtubeEmbed(url);
    if (!embed) {
      toast.error('Enter a YouTube link');
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src: embed }).run();
  };

  const uploadImage = async (file: File) => {
    try {
      const headers = await authHeaders();
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`${API_URL}/api/upload/single?folder=content`, {
        method: 'POST',
        headers,
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.url !== 'string') {
        const message = typeof body.message === 'string'
          ? body.message
          : typeof body.error === 'string'
            ? body.error
            : 'Image upload failed';
        throw new Error(message);
      }
      editor.chain().focus().setImage({ src: body.url }).run();
    } catch (error) {
      toast.error(apiMessage(error, 'Image upload failed'));
    }
  };

  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2">
      {!compact && (
        <>
          <ToolbarButton label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolbarButton label="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        </>
      )}
      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarButton label="Bullets" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton label="Numbers" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      {!compact && (
        <ToolbarButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      )}
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink} />
      {!compact && (
        <>
          <ToolbarButton label="Image" onClick={() => fileRef.current?.click()} />
          <ToolbarButton label="YouTube" onClick={addYoutube} />
          <ToolbarButton label="Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void uploadImage(file);
            }}
          />
        </>
      )}
      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  compact = false,
  editable = true,
  placeholder = 'Write here...',
}: {
  value: string;
  onChange: (html: string) => void;
  compact?: boolean;
  editable?: boolean;
  placeholder?: string;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastEmitted = useRef(value || '');
  const [, setTick] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image,
      Youtube.configure({ width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'article-body min-h-40 px-3 py-2 focus:outline-none sm:min-h-56',
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastEmitted.current = html;
      onChangeRef.current(html);
    },
    onSelectionUpdate: () => setTick((tick) => tick + 1),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const next = value || '';
    if (next === lastEmitted.current || next === editor.getHTML()) return;
    lastEmitted.current = next;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
      <style>{`
        .article-body h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
        .article-body h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
        .article-body p { margin: 0.75rem 0; line-height: 1.65; }
        .article-body ul { list-style: disc; margin: 0.75rem 0 0.75rem 1.25rem; }
        .article-body ol { list-style: decimal; margin: 0.75rem 0 0.75rem 1.25rem; }
        .article-body blockquote { border-left: 3px solid #FF7A19; margin: 1rem 0; padding-left: 1rem; color: #3A3A3A; }
        .article-body a { color: #FF7A19; text-decoration: underline; }
        .article-body img, .article-body iframe { max-width: 100%; height: auto; }
        .article-body iframe { aspect-ratio: 16 / 9; width: 100%; }
        .article-body hr { margin: 1.5rem 0; border: 0; border-top: 1px solid #e5e7eb; }
        .article-body p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      {editable && editor && <Toolbar editor={editor} compact={compact} />}
      <EditorContent editor={editor} />
    </div>
  );
}
