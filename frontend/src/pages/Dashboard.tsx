import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import type { DashboardSummary } from '../types';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Users,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get<DashboardSummary>('/dashboard/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {user?.role === 'ADMIN' ? 'Admin Dashboard' : user?.role === 'SUBMITTER' ? 'My Dashboard' : 'Approver Dashboard'}
      </h1>

      {user?.role === 'ADMIN' && summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={FileText} label="Total Documents" value={summary.totalDocuments} color="bg-blue-500" />
            <StatCard icon={FileText} label="Drafts" value={summary.drafts} color="bg-gray-500" />
            <StatCard icon={Clock} label="Pending" value={summary.pendingDocuments} color="bg-yellow-500" />
            <StatCard icon={CheckCircle} label="Approved" value={summary.approvedDocuments} color="bg-green-500" />
            <StatCard icon={XCircle} label="Rejected" value={summary.rejectedDocuments} color="bg-red-500" />
            <StatCard icon={RefreshCw} label="Returned" value={summary.returnedDocuments} color="bg-orange-500" />
            <StatCard icon={Users} label="Active Users" value={summary.activeUsers} color="bg-purple-500" />
            <StatCard icon={TrendingUp} label="Pending Approvals" value={summary.pendingApprovals} color="bg-indigo-500" />
          </div>

          {summary.recentActivity && summary.recentActivity.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {summary.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.actor.name} - {activity.action}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.entityType} - {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {user?.role === 'SUBMITTER' && summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard icon={FileText} label="Total Documents" value={summary.totalDocuments} color="bg-blue-500" />
            <StatCard icon={FileText} label="Drafts" value={summary.drafts} color="bg-gray-500" />
            <StatCard icon={Clock} label="Pending Approval" value={summary.pendingApprovals} color="bg-yellow-500" />
            <StatCard icon={CheckCircle} label="Approved" value={summary.approvedDocuments} color="bg-green-500" />
            <StatCard icon={XCircle} label="Rejected" value={summary.rejectedDocuments} color="bg-red-500" />
            <StatCard icon={RefreshCw} label="Returned" value={summary.returnedDocuments} color="bg-orange-500" />
          </div>

          {summary.recentDocuments && summary.recentDocuments.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {summary.recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">{doc.title}</p>
                        <p className="text-sm text-gray-500">{doc.category}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doc.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        doc.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                        doc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        doc.status === 'RETURNED_FOR_CHANGES' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {user?.role === 'APPROVER' && summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard icon={Clock} label="Pending Tasks" value={summary.pendingTasks} color="bg-yellow-500" />
            <StatCard icon={CheckCircle} label="Completed Tasks" value={summary.completedTasks} color="bg-green-500" />
          </div>

          {summary.recentApprovals && summary.recentApprovals.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Approvals</h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {summary.recentApprovals.map((approval) => (
                    <div key={approval.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">
                          {approval.workflowInstance.document.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {approval.workflowStage.name} - {approval.workflowInstance.document.submitter.name}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        approval.decision === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        approval.decision === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        approval.decision === 'RETURNED' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {approval.decision}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
