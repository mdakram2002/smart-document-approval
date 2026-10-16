import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import type { ApprovalRecord } from '../types';

const MyApprovals = () => {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await api.get('/approvals/my-tasks');
      setApprovals(response.data);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Approval Tasks</h1>

      {approvals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No pending approval tasks</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div key={approval.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    to={`/documents/${approval.workflowInstance.documentId}`}
                    className="text-lg font-medium text-gray-900 hover:text-blue-600"
                  >
                    {approval.workflowInstance.document.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    {approval.workflowInstance.document.description}
                  </p>
                  <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                    <span>Stage: {approval.workflowStage.name}</span>
                    <span>Submitter: {approval.workflowInstance.document.submitter.name}</span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Pending
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-end space-x-3">
                <Link
                  to={`/documents/${approval.workflowInstance.documentId}`}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Review Document
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApprovals;
