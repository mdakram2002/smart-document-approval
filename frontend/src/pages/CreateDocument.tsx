import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import type { Document } from '../types';
import { Paperclip, X } from 'lucide-react';

const CreateDocument = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(id ?? null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDocument = useCallback(async () => {
    if (!id) return;
    setFetchLoading(true);
    try {
      const response = await api.get<Document>(`/documents/${id}`);
      const doc = response.data;
      setTitle(doc.title);
      setDescription(doc.description);
      setCategory(doc.category);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setFetchLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) void fetchDocument(); }, [id, fetchDocument]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let documentId = id ?? savedDocumentId;
      if (documentId) {
        await api.patch(`/documents/${documentId}`, { title, description, category });
      } else {
        const response = await api.post<Document>('/documents', { title, description, category });
        documentId = response.data.id;
        setSavedDocumentId(documentId);
      }

      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/documents/${documentId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAttachments((pending) => pending.filter((item) => item !== file));
      }

      navigate(`/documents/${documentId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Document saved, but an attachment could not be uploaded. Remove it or retry.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {id ? 'Edit Document' : 'Create New Document'}
      </h1>

      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              id="category"
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., General, Finance, HR"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="attachments" className="block text-sm font-medium text-gray-700">
              Attach files <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              id="attachments"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif"
              onChange={(event) => setAttachments((current) => [...current, ...Array.from(event.target.files ?? [])])}
              className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">Images and screenshots, PDF, Word, or text files. Each file must be within the server upload limit.</p>
            {attachments.length > 0 && (
              <ul className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate text-gray-700">
                      <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="ml-3 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : savedDocumentId ? 'Save changes' : id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDocument;
