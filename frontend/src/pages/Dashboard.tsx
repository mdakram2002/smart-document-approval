import { useCallback, useEffect, useState } from 'react';
import type { ComponentType, FormEvent } from 'react';
import { useAuth } from '../contexts/useAuth';
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

type DashboardFilters = { status: string; category: string; submitterId: string; from: string; to: string };
const StatCard = ({ icon: Icon, label, value, color }: { icon: ComponentType<{ className?: string }>; label: string; value?: number; color: string }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="w-6 h-6 text-white" /></div>
      <div className="ml-4"><p className="text-sm font-medium text-gray-600">{label}</p><p className="text-2xl font-bold text-gray-900">{value || 0}</p></div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({ status: '', category: '', submitterId: '', from: '', to: '' });

  const fetchSummary = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    if (event) setLoading(true);
    try {
      const response = await api.get<DashboardSummary>('/dashboard/summary', { params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard summary:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void fetchSummary(); }, [fetchSummary]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {user?.role === 'ADMIN' ? 'Admin Dashboard' : user?.role === 'SUBMITTER' ? 'My Dashboard' : 'Approver Dashboard'}
      </h1>

      <form onSubmit={(event) => void fetchSummary(event)} className="mb-6 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow md:grid-cols-3 lg:grid-cols-6">
        <label className="text-sm text-gray-600">Status<select className="mt-1 w-full rounded border p-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="RETURNED_FOR_CHANGES">Returned</option></select></label>
        <label className="text-sm text-gray-600">Category<input className="mt-1 w-full rounded border p-2" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} /></label>
        {user?.role === 'ADMIN' && <label className="text-sm text-gray-600">Submitter ID<input className="mt-1 w-full rounded border p-2" value={filters.submitterId} onChange={(e) => setFilters({ ...filters, submitterId: e.target.value })} /></label>}
        <label className="text-sm text-gray-600">Created from<input type="date" className="mt-1 w-full rounded border p-2" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
        <label className="text-sm text-gray-600">Created to<input type="date" className="mt-1 w-full rounded border p-2" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        <button className="self-end rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" type="submit">Apply filters</button>
      </form>

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
