import React, { useState, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Users, Mail, Download, Loader2
} from 'lucide-react';
import { usersApi } from '../services/api';

const STEPS = ['upload', 'preview', 'importing', 'results'];

export default function BulkImportModal({ courses = [], onClose, onComplete, showCourseSelector = true }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [sendEmails, setSendEmails] = useState(true);
  const [previewRows, setPreviewRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    const ext = selected.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
      setError('Please upload a CSV or XLSX file');
      return;
    }

    setFile(selected);
    setError('');

    // Preview CSV files client-side
    if (ext.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setError('File appears to be empty');
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        if (!headers.includes('email')) {
          setError("File must contain an 'email' column");
          setFile(null);
          return;
        }
        const rows = [];
        for (let i = 1; i < Math.min(lines.length, 51); i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const row = {};
          headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
          if (row.email) rows.push(row);
        }
        setPreviewRows(rows);
        setStep('preview');
      };
      reader.readAsText(selected);
    } else {
      // For XLSX, show file info and go to preview without parsing client-side
      setPreviewRows([]);
      setStep('preview');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep('importing');
    setImporting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (courseId) formData.append('course_id', courseId);
      formData.append('send_emails', sendEmails ? 'true' : 'false');

      const res = await usersApi.bulkImport(formData);
      setResults(res.data);
      setStep('results');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Import failed';
      const validationErrors = err.response?.data?.validation_errors;
      setError(msg);
      if (validationErrors?.length) {
        setError(msg + ': ' + validationErrors.map(e => `Row ${e.row}: ${e.error}`).join('; '));
      }
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = 'email,first_name,last_name,username,section\njohn@example.com,John,Doe,john.doe,A\njane@example.com,Jane,Smith,jane.smith,B\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = results?.summary;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-backdropFade">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Bulk Import Students</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600">Upload a CSV or XLSX file with student information to bulk create accounts and enroll students.</p>
              </div>

              {/* Course selection */}
              {showCourseSelector && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enroll in Course (optional)</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No course enrollment</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              )}

              {/* Email toggle */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmails}
                  onChange={(e) => setSendEmails(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Send welcome emails</span>
                  <p className="text-xs text-gray-500">New students will receive their login credentials via email</p>
                </div>
              </label>

              {/* File upload area */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition"
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-lg font-medium text-gray-700">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500 mt-1">CSV or XLSX files supported</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Template download */}
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV template</span>
              </button>

              {/* Required columns info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Required columns:</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">email *</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">first_name</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">last_name</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">username</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">section</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Preview Import</h3>
                  <p className="text-sm text-gray-500">
                    <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                    {file?.name} — {previewRows.length > 0 ? `${previewRows.length} students` : 'XLSX file (preview on server)'}
                  </p>
                </div>
                <button
                  onClick={() => { setStep('upload'); setFile(null); setPreviewRows([]); setError(''); }}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Change file
                </button>
              </div>

              {courseId && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-700">
                  Enrolling in: {courses.find(c => String(c.id) === String(courseId))?.code || 'Selected course'}
                </div>
              )}

              {sendEmails && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Welcome emails will be sent to new students</span>
                </div>
              )}

              {/* Preview table */}
              {previewRows.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">#</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Email</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">First Name</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Last Name</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {previewRows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-2 text-gray-900">{row.email}</td>
                            <td className="px-3 py-2 text-gray-600">{row.first_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.last_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.section || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto text-indigo-600 animate-spin mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Importing Students...</h3>
              <p className="text-gray-500">Creating accounts, enrolling in courses, and sending emails.</p>
              <p className="text-sm text-gray-400 mt-2">This may take a moment for large files.</p>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && summary && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-3" />
                <h3 className="text-xl font-semibold text-gray-900">Import Complete</h3>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{summary.created}</p>
                  <p className="text-xs text-green-600">Created</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{summary.existing}</p>
                  <p className="text-xs text-blue-600">Existing</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{summary.enrolled}</p>
                  <p className="text-xs text-indigo-600">Enrolled</p>
                </div>
                <div className={`${summary.errors > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3 text-center`}>
                  <p className={`text-2xl font-bold ${summary.errors > 0 ? 'text-red-700' : 'text-gray-400'}`}>{summary.errors}</p>
                  <p className={`text-xs ${summary.errors > 0 ? 'text-red-600' : 'text-gray-500'}`}>Errors</p>
                </div>
              </div>

              {summary.emails_sent > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{summary.emails_sent} welcome email{summary.emails_sent !== 1 ? 's' : ''} sent (check MailHog at localhost:8025)</span>
                </div>
              )}

              {/* Error details */}
              {results?.details?.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-700 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {results.details.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation errors */}
              {results?.validation_errors?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-700 mb-2">Validation warnings:</h4>
                  <ul className="text-sm text-yellow-600 space-y-1">
                    {results.validation_errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end space-x-3">
          {step === 'upload' && (
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">
              Cancel
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setFile(null); setPreviewRows([]); setError(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Import Students</span>
              </button>
            </>
          )}
          {step === 'results' && (
            <button
              onClick={() => { onComplete?.(); onClose(); }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
