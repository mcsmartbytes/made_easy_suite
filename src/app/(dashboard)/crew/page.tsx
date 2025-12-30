'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

type CrewMember = {
  id: string;
  name: string;
  role: string | null;
  type: 'employee' | 'subcontractor' | 'crew';
  email: string | null;
  phone: string | null;
  hourly_rate: number | null;
  specialty: string | null;
  license_number: string | null;
  insurance_expiry: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
};

type Assignment = {
  id: string;
  crew_member_id: string;
  job_id: string;
  phase_id: string | null;
  start_date: string | null;
  end_date: string | null;
  scheduled_hours: number | null;
  status: string;
  crew_member_name: string;
  job_name: string;
  phase_name: string | null;
};

type Job = {
  id: string;
  name: string;
};

export default function CrewPage() {
  const { user, loading: authLoading } = useAuth();
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'schedule'>('members');

  // Form states
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [memberForm, setMemberForm] = useState<{
    name: string;
    role: string;
    type: 'employee' | 'subcontractor' | 'crew';
    email: string;
    phone: string;
    hourly_rate: string;
    specialty: string;
    license_number: string;
    insurance_expiry: string;
    notes: string;
  }>({
    name: '',
    role: '',
    type: 'employee',
    email: '',
    phone: '',
    hourly_rate: '',
    specialty: '',
    license_number: '',
    insurance_expiry: '',
    notes: '',
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    crew_member_id: '',
    job_id: '',
    start_date: '',
    end_date: '',
    scheduled_hours: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadData();
    }
  }, [authLoading, user?.id]);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [crewRes, assignRes, jobsRes] = await Promise.all([
        fetch(`/api/crew?user_id=${user.id}`),
        fetch('/api/crew/assignments'),
        fetch(`/api/jobs?user_id=${user.id}`),
      ]);

      const [crewData, assignData, jobsData] = await Promise.all([
        crewRes.json(),
        assignRes.json(),
        jobsRes.json(),
      ]);

      if (crewData.success) setCrewMembers(crewData.data || []);
      if (assignData.success) setAssignments(assignData.data || []);
      if (jobsData.success) setJobs(jobsData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveMember() {
    if (!user?.id || !memberForm.name.trim()) return;

    try {
      const url = editingMember ? '/api/crew' : '/api/crew';
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingMember ? { id: editingMember.id } : { user_id: user.id }),
          name: memberForm.name.trim(),
          role: memberForm.role || null,
          type: memberForm.type,
          email: memberForm.email || null,
          phone: memberForm.phone || null,
          hourly_rate: memberForm.hourly_rate ? Number(memberForm.hourly_rate) : null,
          specialty: memberForm.specialty || null,
          license_number: memberForm.license_number || null,
          insurance_expiry: memberForm.insurance_expiry || null,
          notes: memberForm.notes || null,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      resetMemberForm();
      await loadData();
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    }
  }

  async function deleteMember(id: string) {
    if (!confirm('Delete this crew member? This will also remove all their assignments.')) return;

    try {
      const res = await fetch(`/api/crew?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  }

  async function saveAssignment() {
    if (!assignForm.crew_member_id || !assignForm.job_id) return;

    try {
      const res = await fetch('/api/crew/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crew_member_id: assignForm.crew_member_id,
          job_id: assignForm.job_id,
          start_date: assignForm.start_date || null,
          end_date: assignForm.end_date || null,
          scheduled_hours: assignForm.scheduled_hours ? Number(assignForm.scheduled_hours) : null,
          notes: assignForm.notes || null,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setShowAssignModal(false);
      setAssignForm({ crew_member_id: '', job_id: '', start_date: '', end_date: '', scheduled_hours: '', notes: '' });
      await loadData();
    } catch (err: any) {
      alert('Failed to assign: ' + (err.message || 'Unknown error'));
    }
  }

  async function deleteAssignment(id: string) {
    try {
      const res = await fetch(`/api/crew/assignments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (err) {
      console.error('Error deleting assignment:', err);
    }
  }

  function resetMemberForm() {
    setShowAddMember(false);
    setEditingMember(null);
    setMemberForm({
      name: '', role: '', type: 'employee', email: '', phone: '',
      hourly_rate: '', specialty: '', license_number: '', insurance_expiry: '', notes: '',
    });
  }

  function startEditMember(member: CrewMember) {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      role: member.role || '',
      type: member.type,
      email: member.email || '',
      phone: member.phone || '',
      hourly_rate: member.hourly_rate?.toString() || '',
      specialty: member.specialty || '',
      license_number: member.license_number || '',
      insurance_expiry: member.insurance_expiry || '',
      notes: member.notes || '',
    });
    setShowAddMember(true);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team & Crew</h1>
            <p className="text-gray-600 text-sm mt-1">Manage employees, subcontractors, and crew assignments</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Assign to Job
            </button>
            <button
              onClick={() => setShowAddMember(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Member
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Team Members ({crewMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Job Assignments ({assignments.length})
            </button>
          </nav>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crewMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      member.type === 'subcontractor' ? 'bg-purple-500' :
                      member.type === 'crew' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.role || 'No role specified'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.status}
                  </span>
                </div>

                <div className="space-y-1 text-sm mb-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    member.type === 'subcontractor' ? 'bg-purple-100 text-purple-800' :
                    member.type === 'crew' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {member.type}
                  </span>
                  {member.specialty && (
                    <p className="text-gray-600">Specialty: {member.specialty}</p>
                  )}
                  {member.phone && (
                    <p className="text-gray-600">Phone: {member.phone}</p>
                  )}
                  {member.email && (
                    <p className="text-gray-600 truncate">Email: {member.email}</p>
                  )}
                  {member.hourly_rate && (
                    <p className="text-gray-600">Rate: ${member.hourly_rate.toFixed(2)}/hr</p>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => startEditMember(member)}
                    className="flex-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMember(member.id)}
                    className="flex-1 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {crewMembers.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <p>No team members yet. Click "+ Add Member" to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {assignments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No job assignments yet. Click "Assign to Job" to schedule crew.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crew Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.crew_member_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.job_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.phase_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {a.start_date ? new Date(a.start_date).toLocaleDateString() : '—'}
                        {a.end_date && ` - ${new Date(a.end_date).toLocaleDateString()}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.scheduled_hours || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          a.status === 'completed' ? 'bg-green-100 text-green-800' :
                          a.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteAssignment(a.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Add/Edit Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={memberForm.type}
                      onChange={(e) => setMemberForm({ ...memberForm, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="crew">Crew</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Foreman, Electrician"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={memberForm.hourly_rate}
                      onChange={(e) => setMemberForm({ ...memberForm, hourly_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                    <input
                      type="text"
                      value={memberForm.specialty}
                      onChange={(e) => setMemberForm({ ...memberForm, specialty: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Roofing, HVAC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License #</label>
                    <input
                      type="text"
                      value={memberForm.license_number}
                      onChange={(e) => setMemberForm({ ...memberForm, license_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="License number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
                    <input
                      type="date"
                      value={memberForm.insurance_expiry}
                      onChange={(e) => setMemberForm({ ...memberForm, insurance_expiry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={memberForm.notes}
                      onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={resetMemberForm}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {editingMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign to Job Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Assign to Job</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crew Member *</label>
                  <select
                    value={assignForm.crew_member_id}
                    onChange={(e) => setAssignForm({ ...assignForm, crew_member_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select crew member...</option>
                    {crewMembers.filter(m => m.status === 'active').map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role || m.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job *</label>
                  <select
                    value={assignForm.job_id}
                    onChange={(e) => setAssignForm({ ...assignForm, job_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select job...</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={assignForm.start_date}
                      onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={assignForm.end_date}
                      onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={assignForm.scheduled_hours}
                    onChange={(e) => setAssignForm({ ...assignForm, scheduled_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 40"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignForm({ crew_member_id: '', job_id: '', start_date: '', end_date: '', scheduled_hours: '', notes: '' });
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAssignment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
