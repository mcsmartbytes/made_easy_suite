'use client';

import { useState } from 'react';
import { Plus, Search, Phone, Mail, Building, DollarSign } from 'lucide-react';

export default function CRMPage() {
  const [view, setView] = useState<'contacts' | 'pipeline'>('pipeline');

  const pipelineStages = [
    { id: 'lead', name: 'Leads', deals: [
      { id: 1, name: 'Johnson Sealcoating', company: 'Johnson Properties', value: 4500, contact: 'Mike Johnson' },
      { id: 2, name: 'Oak Street Project', company: 'Oak Development', value: 8200, contact: 'Sarah Oak' },
    ]},
    { id: 'qualified', name: 'Qualified', deals: [
      { id: 3, name: 'Mall Parking Expansion', company: 'City Mall LLC', value: 22000, contact: 'Bob Manager' },
    ]},
    { id: 'proposal', name: 'Proposal Sent', deals: [
      { id: 4, name: 'ABC Corp Lot Reseal', company: 'ABC Corporation', value: 12500, contact: 'Jane Exec' },
      { id: 5, name: 'School District', company: 'Springfield Schools', value: 35000, contact: 'Dr. Principal' },
    ]},
    { id: 'won', name: 'Won', deals: [
      { id: 6, name: 'Smith Residence', company: 'Tom Smith', value: 1800, contact: 'Tom Smith' },
    ]},
  ];

  const contacts = [
    { id: 1, name: 'Mike Johnson', company: 'Johnson Properties', email: 'mike@johnson.com', phone: '555-0101', deals: 2, value: 7500 },
    { id: 2, name: 'Sarah Oak', company: 'Oak Development', email: 'sarah@oak.com', phone: '555-0102', deals: 1, value: 8200 },
    { id: 3, name: 'Bob Manager', company: 'City Mall LLC', email: 'bob@citymall.com', phone: '555-0103', deals: 1, value: 22000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-600">Manage leads, contacts, and deals</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView('pipeline')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'pipeline' ? 'bg-white shadow-sm' : ''}`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setView('contacts')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'contacts' ? 'bg-white shadow-sm' : ''}`}
            >
              Contacts
            </button>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add {view === 'pipeline' ? 'Deal' : 'Contact'}
          </button>
        </div>
      </div>

      {view === 'pipeline' ? (
        /* Pipeline View */
        <div className="grid grid-cols-4 gap-4">
          {pipelineStages.map((stage) => (
            <div key={stage.id} className="bg-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{stage.name}</h3>
                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-sm">
                  {stage.deals.length}
                </span>
              </div>
              <div className="space-y-3">
                {stage.deals.map((deal) => (
                  <div key={deal.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-900">{deal.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{deal.company}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-gray-600">{deal.contact}</span>
                      <span className="font-semibold text-green-600">${deal.value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                + Add deal
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Contacts View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">{contact.name[0]}</span>
                      </div>
                      <span className="font-medium text-gray-900">{contact.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{contact.company}</td>
                  <td className="px-5 py-4">
                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{contact.phone}</td>
                  <td className="px-5 py-4 text-right font-medium text-gray-900">${contact.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
