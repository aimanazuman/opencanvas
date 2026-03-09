import React from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';
import { getPreviewType, getFileTypeInfo, formatFileSize } from '../../utils/fileIcons';

export default function DocumentPreviewModal({ fileUrl, fileName, fileSize, onClose }) {
  if (!fileUrl) return null;

  const previewType = getPreviewType(fileName);
  const fileInfo = getFileTypeInfo(fileName);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-medium text-gray-800 truncate">{fileName || 'Document Preview'}</h3>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 overflow-auto">
          {previewType === 'pdf' && (
            <iframe
              src={fileUrl}
              title={fileName || 'PDF Preview'}
              className="w-full h-full border-0"
            />
          )}

          {previewType === 'image' && (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={fileUrl}
                alt={fileName || 'Image Preview'}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          )}

          {previewType === 'office' && (
            <div className="flex items-center justify-center h-full p-8">
              <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl ${fileInfo.bg} mb-4`}>
                  <FileText className={`w-8 h-8 ${fileInfo.color}`} />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{fileName}</h4>
                <p className="text-sm text-gray-500 mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${fileInfo.bg} ${fileInfo.color}`}>
                    {fileInfo.label}
                  </span>
                </p>
                {fileSize && (
                  <p className="text-sm text-gray-400 mb-4">{formatFileSize(fileSize)}</p>
                )}
                <p className="text-sm text-gray-500 mb-6">
                  This file type cannot be previewed in the browser. Download it to view in the appropriate application.
                </p>
                <a
                  href={fileUrl}
                  download={fileName}
                  className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  <Download size={18} />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          )}

          {previewType === 'unknown' && (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Preview not available for this file type.</p>
                <a
                  href={fileUrl}
                  download={fileName}
                  className="inline-flex items-center space-x-2 mt-4 text-indigo-600 hover:underline"
                >
                  <Download size={16} />
                  <span>Download instead</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
