import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Document, ApprovalRecord } from '../types';
import { useAuth } from '../contexts/useAuth';
import { 
  ArrowLeft, 
  Send, 
  Check, 
  X, 
  RefreshCw, 
  FileText,
  Calendar,
  User,
  Paperclip,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [comment, setComment] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  const fetchDocument = useCallback(async () => {
    try {
      const response = await api.get<Document>(`/documents/${id}`);
      setDocument(response.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api.get<Document>(`/documents/${id}`)
      .then((response) => { if (active) setDocument(response.data); })
      .catch((error) => console.error('Failed to fetch document:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!document) return;
    let active = true;
    const objectUrls: string[] = [];
    const imageAttachments = document.attachments.filter((attachment) => attachment.mimeType.startsWith('image/'));

    imageAttachments.forEach(async (attachment) => {
      try {
        const response = await api.get(`/documents/${document.id}/attachments/${attachment.id}`, {
          responseType: 'blob',
        });
        if (!active) return;
        const objectUrl = URL.createObjectURL(response.data);
        objectUrls.push(objectUrl);
        setImagePreviews((current) => ({ ...current, [attachment.id]: objectUrl }));
      } catch {
        // The attachment row remains available for download if preview loading fails.
      }
    });

    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [document]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setActionError('');
    try {
      await api.post(`/documents/${id}/submit`);
      await fetchDocument();
    } catch (error: any) {
      console.error('Failed to submit document:', error);
      setActionError(error.response?.data?.error || 'Failed to submit document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this document?')) return;
    setSubmitting(true);
    setActionError('');
    try {
      await api.post(`/documents/${id}/withdraw`);
      await fetchDocument();
    } catch (error: any) {
      console.error('Failed to withdraw document:', error);
      setActionError(error.response?.data?.error || 'Failed to withdraw document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async (approvalId: string, decision: string) => {
    setSubmitting(true);
    setActionError('');
    try {
      const endpoint = decision === 'APPROVED' ? 'approve' : decision === 'REJECTED' ? 'reject' : 'return';
      await api.post(`/approvals/${approvalId}/${endpoint}`, { comment });
      setComment('');
      await fetchDocument();
    } catch (error: any) {
      console.error('Failed to process approval:', error);
      setActionError(error.response?.data?.error || 'Failed to process approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadAttachments = async () => {
    if (!document) return;
    setAttachmentBusy(true);
    setAttachmentError('');
    try {
      for (const file of attachmentFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/documents/${document.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAttachmentFiles((current) => current.filter((pending) => pending !== file));
      }
      await fetchDocument();
    } catch (error: any) {
      setAttachmentError(error.response?.data?.error || 'Failed to upload attachment');
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await api.get(`/documents/${document?.id}/attachments/${attachmentId}`, {
        responseType: 'blob',
      });
      const objectUrl = URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error: any) {
      setAttachmentError(error.response?.data?.error || 'Failed to download attachment');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!document) {
    return <div className="text-center py-12">Document not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'RETURNED_FOR_CHANGES':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'RETURNED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const ownsDocument = user?.id === document.submitterId;
  const canSubmit = ownsDocument && user?.role === 'SUBMITTER' && (document.status === 'DRAFT' || document.status === 'RETURNED_FOR_CHANGES');
  const canWithdraw = ownsDocument && user?.role === 'SUBMITTER' && document.status === 'PENDING_APPROVAL';
  const canEdit = document.status === 'DRAFT' || document.status === 'RETURNED_FOR_CHANGES';
  const canManageAttachments = canEdit && (user?.role === 'ADMIN' || user?.id === document.submitterId);

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{document.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {document.submitter.name}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(document.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(document.status)}`}>
            {document.status.replace('_', ' ')}
          </span>
        </div>

        <div className="mb-4">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            {document.category}
          </span>
          <span className="ml-2 text-sm text-gray-500">Version {document.version}</span>
        </div>

        <div className="prose max-w-none">
          <p className="text-gray-700">{document.description}</p>
        </div>

        <div className="mt-6 border-t pt-5">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Attachments</h3>
          {attachmentError && (
            <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{attachmentError}</div>
          )}
          {document.attachments.length > 0 ? (
            <div className="space-y-2">
              {document.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                  {attachment.mimeType.startsWith('image/') && imagePreviews[attachment.id] ? (
                    <img src={imagePreviews[attachment.id]} alt={attachment.originalName} className="h-14 w-14 rounded object-cover" />
                  ) : attachment.mimeType.startsWith('image/') ? (
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{attachment.originalName}</p>
                    <p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                    className="inline-flex items-center rounded px-2 py-1 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    <Download className="mr-1 h-4 w-4" /> Download
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No attachments yet.</p>
          )}

          {canManageAttachments && (
            <div className="mt-4">
              <label htmlFor="document-attachments" className="block text-sm font-medium text-gray-700">
                Add images, screenshots, PDF, or Word documents
              </label>
              <input
                id="document-attachments"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif"
                onChange={(event) => setAttachmentFiles((current) => [...current, ...Array.from(event.target.files ?? [])])}
                className="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              {attachmentFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachmentFiles.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 truncate text-gray-700">
                        <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setAttachmentFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                        className="ml-3 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleUploadAttachments}
                    disabled={attachmentBusy}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {attachmentBusy ? 'Uploading...' : 'Upload attachments'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {actionError && (
          <div role="alert" className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
        <div className="mt-6 flex space-x-3">
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Approval
            </button>
          )}
          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={submitting}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Withdraw
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => navigate(`/documents/${id}/edit`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {document.workflowInstance && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Timeline</h2>
          <div className="space-y-4">
            {document.workflowInstance.approvalRecords.map((record: ApprovalRecord) => (
              <div key={record.id} className="border-l-4 pl-4" style={{
                borderColor: record.decision === 'APPROVED' ? '#10b981' : 
                           record.decision === 'REJECTED' ? '#ef4444' : 
                           record.decision === 'RETURNED' ? '#f97316' : '#e5e7eb'
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{record.workflowStage.name}</p>
                    <p className="text-sm text-gray-500">Approver: {record.approver.name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDecisionColor(record.decision)}`}>
                    {record.decision}
                  </span>
                </div>
                {record.comment && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {record.comment}
                  </p>
                )}
                {record.decisionAt && (
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(record.decisionAt).toLocaleString()}
                  </p>
                )}
                {record.decision === 'PENDING' && (
                  <div className="mt-3 space-x-2">
                    {user?.role === 'APPROVER' && record.approverId === user.id && record.workflowStage.stageOrder === document.currentStage && (
                      <>
                        <button
                          onClick={() => handleApproval(record.id, 'APPROVED')}
                          disabled={submitting}
                          className="flex items-center px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(record.id, 'REJECTED')}
                          disabled={submitting}
                          className="flex items-center px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproval(record.id, 'RETURNED')}
                          disabled={submitting}
                          className="flex items-center px-3 py-1 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Return
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {user?.role === 'APPROVER' && document.status === 'PENDING_APPROVAL' && document.workflowInstance.approvalRecords.some((record) => record.approverId === user.id && record.workflowStage.stageOrder === document.currentStage && record.decision === 'PENDING') && (
            <label className="mt-5 block text-sm font-medium text-gray-700">Approval comment
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} maxLength={2000} className="mt-1 w-full rounded-md border border-gray-300 p-2" placeholder="Add notes for the submitter or next reviewer" />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentDetail;
