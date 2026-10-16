import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import type { WorkflowDefinition } from '../types';
import type { User } from '../types';
import { GitBranch, Plus, Power, PowerOff, Pencil } from 'lucide-react';

const WorkflowManagement = () => {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    stages: [{ name: 'Review', approverIds: [''] }],
  });

  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await api.get('/workflows');
      setWorkflows(response.data);
      const users = await api.get('/users');
      setApprovers(users.data.filter((user: User) => user.role === 'APPROVER' && user.status === 'ACTIVE'));
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchWorkflows(); }, [fetchWorkflows]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        ...formData,
        stages: formData.stages.map((stage) => ({ ...stage, approverIds: stage.approverIds.filter(Boolean) })),
      };
      if (editingWorkflowId) await api.patch(`/workflows/${editingWorkflowId}`, payload);
      else await api.post('/workflows', payload);
      setShowCreateForm(false);
      setEditingWorkflowId(null);
      setFormData({ name: '', description: '', category: '', stages: [{ name: 'Review', approverIds: [''] }] });
      await fetchWorkflows();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Failed to save workflow configuration.');
    }
  };

  const editWorkflow = (workflow: WorkflowDefinition) => {
    setEditingWorkflowId(workflow.id);
    setFormError('');
    setFormData({
      name: workflow.name,
      description: workflow.description ?? '',
      category: workflow.category,
      stages: workflow.stages.map((stage) => ({
        name: stage.name,
        approverIds: stage.approverAssignments?.map((assignment) => assignment.approverId) ?? [],
      })),
    });
    setShowCreateForm(true);
  };

  const toggleWorkflowStatus = async (workflowId: string, currentStatus: boolean) => {
    try {
      const endpoint = currentStatus ? 'deactivate' : 'activate';
      await api.post(`/workflows/${workflowId}/${endpoint}`);
      await fetchWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
        <button
          onClick={() => {
            setEditingWorkflowId(null);
            setFormError('');
            setFormData({ name: '', description: '', category: '', stages: [{ name: 'Review', approverIds: [''] }] });
            setShowCreateForm(!showCreateForm);
          }}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingWorkflowId ? 'Edit Workflow Configuration' : 'Create New Workflow'}</h2>
          {formError && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Sequential stages and assigned approvers</h3>
                <button type="button" onClick={() => setFormData({ ...formData, stages: [...formData.stages, { name: `Stage ${formData.stages.length + 1}`, approverIds: [''] }] })} className="text-sm text-blue-700">Add stage</button>
              </div>
              {formData.stages.map((stage, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-2 rounded border p-3">
                  <label className="text-sm">Stage {index + 1} name
                    <input required value={stage.name} onChange={(event) => setFormData({ ...formData, stages: formData.stages.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} className="mt-1 w-full rounded border px-3 py-2" />
                  </label>
                  <label className="text-sm">Approvers (Ctrl/Cmd-click for multiple)
                    <select required multiple value={stage.approverIds.filter(Boolean)} onChange={(event) => setFormData({ ...formData, stages: formData.stages.map((item, i) => i === index ? { ...item, approverIds: Array.from(event.target.selectedOptions, (option) => option.value) } : item) })} className="mt-1 w-full rounded border px-3 py-2">
                      {approvers.map((approver) => <option key={approver.id} value={approver.id}>{approver.name} ({approver.email})</option>)}
                    </select>
                  </label>
                  {formData.stages.length > 1 && <button type="button" onClick={() => setFormData({ ...formData, stages: formData.stages.filter((_, i) => i !== index) })} className="text-left text-sm text-red-700">Remove stage</button>}
                </div>
              ))}
              {approvers.length === 0 && <p className="text-sm text-red-700">Create or assign an active Approver account before configuring a workflow.</p>}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setEditingWorkflowId(null); setFormError(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {editingWorkflowId ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <GitBranch className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {workflow.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {workflow.description && (
                  <p className="text-sm text-gray-600 mt-2">{workflow.description}</p>
                )}
                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                  <span>Category: {workflow.category}</span>
                  <span>Stages: {workflow.stages.length}</span>
                  <span>Used: {workflow._count?.instances || 0} times</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Approval Stages:</p>
                  <div className="space-y-1">
                    {workflow.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center text-sm text-gray-600">
                        <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium mr-2">
                          {index + 1}
                        </span>
                        <span>{stage.name}</span>
                        <span className="ml-2 text-xs text-gray-500">— {stage.approverAssignments?.map((assignment) => assignment.approver.name).join(', ') || 'No approver assigned'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => editWorkflow(workflow)}
                disabled={(workflow._count?.instances || 0) > 0}
                className="ml-4 p-2 text-gray-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                title={(workflow._count?.instances || 0) > 0 ? 'Used workflows are immutable; create a new configuration for future documents' : 'Edit workflow'}
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => toggleWorkflowStatus(workflow.id, workflow.isActive)}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                title={workflow.isActive ? 'Deactivate' : 'Activate'}
              >
                {workflow.isActive ? (
                  <PowerOff className="w-5 h-5" />
                ) : (
                  <Power className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowManagement;
