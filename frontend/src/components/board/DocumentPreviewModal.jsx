import React, { useEffect, useState } from 'react';
import { ExternalLink, Download, FileText } from 'lucide-react';
import { getPreviewType, getFileTypeInfo, formatFileSize } from '../../utils/fileIcons';
import { safeDisplayUrl } from '../../utils/media';
import { ClassroomDialog } from '../classroom';

// Static class strings: Tailwind sees every class. 44 px on phones, 32 px on desktop.
const ICON_LINK = 'btn-motion flex h-11 w-11 items-center justify-center rounded text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';
const TEXT_LINK = 'btn-motion inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover hover:underline md:min-h-[32px]';
const PRIMARY_LINK = 'btn-motion inline-flex min-h-[44px] items-center gap-2 rounded bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover md:min-h-[32px]';

export default function DocumentPreviewModal({ fileUrl: rawUrl, fileName, fileSize, onClose }) {
  // fileUrl normally is a short-lived signed URL; anything that is not http(s)/blob is dropped
  const fileUrl = safeDisplayUrl(rawUrl);
  const previewType = getPreviewType(fileName);
  const fileInfo = getFileTypeInfo(fileName);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfFailed, setPdfFailed] = useState(false);

  // The server sends uploads as downloads (never as web pages), so a PDF cannot be shown by pointing an iframe at it.
  // Fetch it, wrap it as a PDF blob and show that instead: the browser's PDF viewer renders it, nothing can run.
  useEffect(() => {
    if (previewType !== 'pdf' || !fileUrl) return undefined;
    if (fileUrl.startsWith('blob:')) {
      setPdfUrl(fileUrl);
      return undefined;
    }
    let cancelled = false;
    let objectUrl = null;
    setPdfUrl(null);
    setPdfFailed(false);
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error('download failed');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setPdfUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPdfFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl, previewType]);

  if (!fileUrl) return null;

  const openLink = (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={ICON_LINK}
      title="Open / download"
      aria-label="Open / download"
    >
      <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
    </a>
  );

  return (
    <ClassroomDialog
      titleId="document-preview-title"
      title="Document preview"
      subtitle={fileName || undefined}
      onClose={onClose}
      size="wide"
      className="h-[80vh]"
      headerActions={openLink}
      dismissOnScrim
      bodyFlush
    >
      <div className="flex h-full min-h-0 flex-col bg-gray-100">
        {previewType === 'pdf' && pdfUrl && (
          <iframe
            src={pdfUrl}
            title={fileName || 'PDF Preview'}
            className="h-full w-full border-0"
          />
        )}

        {previewType === 'pdf' && !pdfUrl && !pdfFailed && (
          <div role="status" className="flex h-full items-center justify-center p-6 text-sm text-ink-2">Loading preview...</div>
        )}

        {previewType === 'pdf' && pdfFailed && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <FileText className="mx-auto mb-3 h-5 w-5 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm font-medium text-ink">The preview could not be loaded.</p>
              <a href={fileUrl} download={fileName} className={`${TEXT_LINK} mt-4 justify-center`}>
                <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>Download instead</span>
              </a>
            </div>
          </div>
        )}

        {previewType === 'image' && (
          <div className="flex h-full items-center justify-center overflow-auto p-4">
            <img
              src={fileUrl}
              alt={fileName || 'Image Preview'}
              className="max-h-full max-w-full rounded object-contain"
            />
          </div>
        )}

        {previewType === 'office' && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="w-full max-w-md rounded border border-line bg-surface p-6 text-center">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded ${fileInfo.bg}`}>
                <FileText className={`h-6 w-6 ${fileInfo.color}`} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="mb-1 break-words text-base font-semibold text-ink">{fileName}</h3>
              <p className="mb-1 text-sm text-ink-2">
                <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${fileInfo.bg} ${fileInfo.color}`}>
                  {fileInfo.label}
                </span>
              </p>
              {fileSize && (
                <p className="mb-4 text-sm text-ink-3">{formatFileSize(fileSize)}</p>
              )}
              <p className="mb-6 text-sm text-ink-2">
                This file type cannot be previewed in the browser. Download it to view in the appropriate application.
              </p>
              <a href={fileUrl} download={fileName} className={PRIMARY_LINK}>
                <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>Download File</span>
              </a>
            </div>
          </div>
        )}

        {previewType === 'unknown' && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <FileText className="mx-auto mb-3 h-5 w-5 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm font-medium text-ink">Preview not available for this file type.</p>
              <a href={fileUrl} download={fileName} className={`${TEXT_LINK} mt-4 justify-center`}>
                <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>Download instead</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </ClassroomDialog>
  );
}
