import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

// Renders thumbnail previews for a selected FileList (images) before upload.
export function FilePreview({ files }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const list = files ? Array.from(files) : [];
    const made = list.map((f) => ({
      name: f.name,
      isImage: f.type.startsWith('image/'),
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setUrls(made);
    return () => made.forEach((m) => m.url && URL.revokeObjectURL(m.url));
  }, [files]);

  if (urls.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((u, i) =>
        u.isImage ? (
          <img
            key={i}
            src={u.url}
            alt={u.name}
            className="size-16 rounded-md border border-border object-cover"
          />
        ) : (
          <div
            key={i}
            className="flex size-16 flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface-2 p-1 text-fg-subtle"
          >
            <FileText className="size-5" />
            <span className="w-full truncate text-center text-[9px]">{u.name}</span>
          </div>
        )
      )}
    </div>
  );
}

// Grid of already-uploaded document thumbnails (images render inline; docs as links).
export function DocumentGallery({ documents = [] }) {
  if (documents.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {documents.map((doc) =>
        doc.kind === 'PHOTO' ? (
          <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer">
            <img
              src={doc.url}
              alt="asset"
              className="size-20 rounded-md border border-border object-cover transition-opacity hover:opacity-80"
            />
          </a>
        ) : (
          <a
            key={doc.id}
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface-2 text-fg-muted hover:text-fg"
          >
            <FileText className="size-6" />
            <span className="text-[10px]">Document</span>
          </a>
        )
      )}
    </div>
  );
}
