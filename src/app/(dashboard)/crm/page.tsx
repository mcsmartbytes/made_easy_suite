'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Phone, Mail, Building, MoreVertical, Pencil, Trash2, X, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useContacts } from '@/hooks/useContacts';
import type { Contact } from '@/types/database';

const typeColors: Record<string, string> = {
  lead: 'bg-purple-100 text-purple-700',
  prospect: 'bg-blue-100 text-blue-700',
  customer: 'bg-green-100 text-green-700',
  vendor: 'bg-orange-100 text-orange-700',
  partner: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const pipelineStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];

export default function CRMPage() {
  const { user } = useAuth();
  const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts(user?.id);

  const [view, setView] = useState<'contacts' | 'pipeline'>('pipeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    type: 'lead' as Contact['type'],
    status: 'new' as Contact['status'],
    source: '',
    deal_value: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      company: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      type: 'lead',
      status: 'new',
      source: '',
      deal_value: '',
      notes: '',
    });
    setEditingContact(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zip: contact.zip || '',
      type: contact.type,
      status: contact.status,
      source: contact.source || '',
      deal_value: contact.deal_value?.toString() || '',
      notes: contact.notes || '',
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const contactData = {
      first_name: formData.first_name,
      last_name: formData.last_name || null,
      company: formData.company || null,
      email: formData.email || null,
      phone: formData.phone || null,
      mobile: formData.mobile || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      type: formData.type,
      status: formData.status,
      source: formData.source || null,
      deal_value: parseFloat(formData.deal_value) || null,
      notes: formData.notes || null,
    };

    if (editingContact) {
      await updateContact(editingContact.id, contactData);
    } else {
      await createContact(contactData);
    }

    setShowModal(false);
    resetForm();
  };

  const handleStatusChange = async (contactId: string, newStatus: Contact['status']) => {
    await updateContact(contactId, { status: newStatus, last_contacted: new Date().toISOString() });
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    setDeleteConfirm(null);
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = !searchTerm ||
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || contact.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [contacts, searchTerm, typeFilter]);

  // Group contacts by status for pipeline view
  const contactsByStage = useMemo(() => {
    return pipelineStages.reduce((acc, stage) => {
      acc[stage] = contacts.filter(c => c.status === stage && c.status !== 'lost');
      return acc;
    }, {} as Record<string, Contact[]>);
  }, [contacts]);

  // Calculate stats
  const activeLeads = contacts.filter(c => ['new', 'contacted', 'qualified'].includes(c.status)).length;
  const pipelineValue = contacts
    .filter(c => !['won', 'lost'].includes(c.status))
    .reduce((sum, c) => sum + (c.deal_value || 0), 0);
  const wonValue = contacts
    .filter(c => c.status === 'won')
    .reduce((sum, c) => sum + (c.deal_value || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-600">Manage leads, contacts, and deals</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView('pipeline')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'pipeline' ? 'bg-white shadow-sm' : ''
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setView('contacts')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'contacts' ? 'bg-white shadow-sm' : ''
              }`}
            >
              Contacts
            </button>
          </div>
          <button
            onClick={openNewModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Active Leads</p>
          <p className="text-2xl font-bold text-gray-900">{activeLeads}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Pipeline Value</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(pipelineValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Won This Month</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(wonValue)}</p>
        </div>
      </div>

      {view === 'pipeline' ? (
        /* Pipeline/Kanban View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {pipelineStages.map((stage) => (
              <div key={stage} className="w-72 bg-gray-100 rounded-xl p-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">{statusLabels[stage]}</h3>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-sm">
                    {contactsByStage[stage]?.length || 0}
                  </span>
                </div>
                <div className="space-y-3">
                  {contactsByStage[stage]?.map((contact) => (
                    <div
                      key={contact.id}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {contact.first_name} {contact.last_name}
                          </h4>
                          {contact.company && (
                            <p className="text-sm text-gray-500 truncate">{contact.company}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === contact.id ? null : contact.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      {contact.deal_value && (
                        <p className="text-lg font-semibold text-green-600 mt-2">
                          {formatCurrency(contact.deal_value)}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[contact.type]}`}>
                          {contact.type}
                        </span>
                        {stage !== 'won' && (
                          <button
                            onClick={() => {
                              const nextStage = pipelineStages[pipelineStages.indexOf(stage) + 1];
                              if (nextStage) handleStatusChange(contact.id, nextStage as Contact['status']);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                          >
                            Move <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Actions Menu */}
                      {menuOpen === contact.id && (
                        <div className="absolute mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => openEditModal(contact)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleStatusChange(contact.id, 'won')}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 w-full"
                          >
                            Mark as Won
                          </button>
                          <button
                            onClick={() => handleStatusChange(contact.id, 'lost')}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                          >
                            Mark as Lost
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              setDeleteConfirm(contact.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setFormData(prev => ({ ...prev, status: stage as Contact['status'] }));
                    setShowModal(true);
                  }}
                  className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  + Add contact
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Contacts List View */
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="lead">Leads</option>
              <option value="prospect">Prospects</option>
              <option value="customer">Customers</option>
              <option value="vendor">Vendors</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">
                  {searchTerm || typeFilter !== 'all'
                    ? 'No contacts match your search'
                    : 'No contacts yet. Add your first contact!'}
                </p>
                <button
                  onClick={openNewModal}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Contact
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deal Value</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-medium">{contact.first_name[0]}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {contact.first_name} {contact.last_name}
                              </p>
                              {contact.email && (
                                <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{contact.company || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[contact.type]}`}>
                            {contact.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{statusLabels[contact.status]}</td>
                        <td className="px-5 py-4 text-right font-medium text-gray-900">
                          {contact.deal_value ? formatCurrency(contact.deal_value) : '—'}
                        </td>
                        <td className="px-5 py-4 text-right relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {menuOpen === contact.id && (
                            <div className="absolute right-4 top-12 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={() => openEditModal(contact)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                onClick={() => {
                                  setMenuOpen(null);
                                  setDeleteConfirm(contact.id);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Type and Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Contact['type'] })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="partner">Partner</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Contact['status'] })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.deal_value}
                      onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select source</option>
                  <option value="Referral">Referral</option>
                  <option value="Website">Website</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Facebook">Facebook</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Trade Show">Trade Show</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {editingContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Contact?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this contact? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
