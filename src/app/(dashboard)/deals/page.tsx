'use client';

import { useState, useEffect } from 'react';
import { Plus, DollarSign, Calendar, User, X } from 'lucide-react';

interface Deal {
  id: number;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  contactId: number | null;
  companyId: number | null;
  description: string | null;
  contact?: { firstName: string; lastName: string } | null;
  company?: { name: string } | null;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
}

interface Company {
  id: number;
  name: string;
}

const stages = [
  { id: 'lead', name: 'Lead', color: 'bg-slate-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-yellow-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
  { id: 'lost', name: 'Lost', color: 'bg-red-500' },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const [form, setForm] = useState({
    title: '',
    value: '',
    stage: 'lead',
    probability: '10',
    expectedCloseDate: '',
    contactId: '',
    companyId: '',
    description: '',
  });

  useEffect(() => {
    fetchDeals();
    fetchContacts();
    fetchCompanies();
  }, []);

  async function fetchDeals() {
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      setDeals(data);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchContacts() {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }

  async function fetchCompanies() {
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      ...form,
      value: parseFloat(form.value) || 0,
      probability: parseInt(form.probability) || 0,
      contactId: form.contactId ? parseInt(form.contactId) : null,
      companyId: form.companyId ? parseInt(form.companyId) : null,
    };

    try {
      if (editingDeal) {
        await fetch(`/api/deals/${editingDeal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      fetchDeals();
      closeModal();
    } catch (error) {
      console.error('Error saving deal:', error);
    }
  }

  async function updateDealStage(dealId: number, newStage: string) {
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      fetchDeals();
    } catch (error) {
      console.error('Error updating deal stage:', error);
    }
  }

  function openModal(deal?: Deal) {
    if (deal) {
      setEditingDeal(deal);
      setForm({
        title: deal.title,
        value: deal.value.toString(),
        stage: deal.stage,
        probability: deal.probability.toString(),
        expectedCloseDate: deal.expectedCloseDate || '',
        contactId: deal.contactId?.toString() || '',
        companyId: deal.companyId?.toString() || '',
        description: deal.description || '',
      });
    } else {
      setEditingDeal(null);
      setForm({
        title: '',
        value: '',
        stage: 'lead',
        probability: '10',
        expectedCloseDate: '',
        contactId: '',
        companyId: '',
        description: '',
      });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingDeal(null);
  }

  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(d => d.stage === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  const totalPipeline = deals
    .filter(d => !['won', 'lost'].includes(d.stage))
    .reduce((sum, d) => sum + d.value, 0);

  const wonValue = deals
    .filter(d => d.stage === 'won')
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Deals Pipeline</h1>
          <div className="flex gap-4 mt-2">
            <p className="text-slate-600">Pipeline: <span className="font-semibold text-slate-800">${totalPipeline.toLocaleString()}</span></p>
            <p className="text-slate-600">Won: <span className="font-semibold text-green-600">${wonValue.toLocaleString()}</span></p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          Add Deal
        </button>
      </div>

      {/* Pipeline View */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading deals...</div>
      ) : (
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {stages.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-36 sm:w-44 md:w-52 lg:w-60">
              <div className={`${stage.color} text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-t-lg flex items-center justify-between`}>
                <span className="font-semibold text-xs sm:text-sm truncate">{stage.name}</span>
                <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 rounded text-xs ml-1">
                  {dealsByStage[stage.id]?.length || 0}
                </span>
              </div>
              <div className="bg-slate-100 rounded-b-lg p-2 sm:p-3 min-h-[300px] sm:min-h-[400px] space-y-2 sm:space-y-3">
                {dealsByStage[stage.id]?.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => openModal(deal)}
                    className="bg-white rounded-lg p-2 sm:p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h3 className="font-semibold text-slate-800 text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2">{deal.title}</h3>
                    <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2 text-green-600 font-medium">
                        <DollarSign size={12} className="sm:w-3.5 sm:h-3.5" />
                        ${deal.value.toLocaleString()}
                      </div>
                      {deal.contact && (
                        <div className="flex items-center gap-1 sm:gap-2 text-slate-500 hidden sm:flex">
                          <User size={12} className="sm:w-3.5 sm:h-3.5" />
                          <span className="truncate">{deal.contact.firstName} {deal.contact.lastName}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-1 sm:h-1.5">
                        <div
                          className="bg-blue-500 h-1 sm:h-1.5 rounded-full"
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs text-slate-500">{deal.probability}%</span>
                    </div>
                  </div>
                ))}
                {dealsByStage[stage.id]?.length === 0 && (
                  <p className="text-center text-slate-400 text-xs sm:text-sm py-4">No deals</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingDeal ? 'Edit Deal' : 'Add Deal'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Close</label>
                  <input
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                  <select
                    value={form.contactId}
                    onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select contact...</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                  <select
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select company...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingDeal ? 'Update' : 'Create'} Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
