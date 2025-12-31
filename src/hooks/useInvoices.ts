'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Invoice } from '@/types/database';

interface UseInvoicesReturn {
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createInvoice: (invoice: Partial<Invoice>) => Promise<Invoice | null>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<Invoice | null>;
  deleteInvoice: (id: string) => Promise<boolean>;
  getInvoice: (id: string) => Promise<Invoice | null>;
  generateInvoiceNumber: () => string;
}

// Demo invoices - impressive commercial invoices for presentations
const demoInvoices: Invoice[] = [
  {
    id: 'inv-1',
    user_id: 'demo',
    job_id: 'demo-3',
    client_name: 'Costco Wholesale',
    client_email: 'facilities@costco.com',
    invoice_number: 'INV-2024-047',
    status: 'paid',
    subtotal: 125000,
    tax_rate: 0,
    tax_amount: 0,
    total: 125000,
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sent_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Distribution Center - 380,000 sq ft complete',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-2',
    user_id: 'demo',
    job_id: 'demo-1',
    client_name: 'Westfield Property Management',
    client_email: 'ap@westfield.com',
    invoice_number: 'INV-2024-052',
    status: 'sent',
    subtotal: 43750,
    tax_rate: 0,
    tax_amount: 0,
    total: 43750,
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: null,
    notes: 'Mall Main Lot - 50% progress billing (Phase 1)',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-3',
    user_id: 'demo',
    job_id: 'demo-5',
    client_name: 'Marriott International',
    client_email: 'facilities@marriott.com',
    invoice_number: 'INV-2024-051',
    status: 'sent',
    subtotal: 22500,
    tax_rate: 0,
    tax_amount: 0,
    total: 22500,
    due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: null,
    notes: 'Hotel Complex - 50% deposit invoice',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-4',
    user_id: 'demo',
    job_id: 'demo-2',
    client_name: 'Chicago Dept of Aviation',
    client_email: 'contracts@flychicago.com',
    invoice_number: 'INV-2025-001',
    status: 'draft',
    subtotal: 78000,
    tax_rate: 0,
    tax_amount: 0,
    total: 78000,
    due_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sent_at: null,
    paid_at: null,
    notes: 'O\'Hare Employee Lot C - 50% deposit (pending approval)',
    created_at: new Date().toISOString(),
  },
  {
    id: 'inv-5',
    user_id: 'demo',
    job_id: 'demo-4',
    client_name: 'Target Corporation',
    client_email: 'vendorpay@target.com',
    invoice_number: 'INV-2025-002',
    status: 'draft',
    subtotal: 34250,
    tax_rate: 0,
    tax_amount: 0,
    total: 34250,
    due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sent_at: null,
    paid_at: null,
    notes: 'Target Plaza - 50% deposit invoice (March project)',
    created_at: new Date().toISOString(),
  },
];

export function useInvoices(userId: string | undefined): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const generateInvoiceNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const count = invoices.length + 1;
    return `INV-${year}-${count.toString().padStart(3, '0')}`;
  }, [invoices.length]);

  const fetchInvoices = useCallback(async () => {
    if (!userId) {
      setInvoices(demoInvoices);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices?user_id=${userId}`);
      const result = await res.json();

      if (result.success && result.data && result.data.length > 0) {
        setInvoices(result.data);
        setIsDemo(false);
      } else {
        setInvoices(demoInvoices);
        setIsDemo(true);
      }
    } catch (err) {
      console.error('Invoices fetch error:', err);
      setError('Failed to load invoices');
      setInvoices(demoInvoices);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createInvoice = async (invoiceData: Partial<Invoice>): Promise<Invoice | null> => {
    if (!userId || isDemo) {
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        user_id: userId || 'demo',
        job_id: invoiceData.job_id || null,
        client_name: invoiceData.client_name || null,
        client_email: invoiceData.client_email || null,
        invoice_number: invoiceData.invoice_number || generateInvoiceNumber(),
        status: invoiceData.status || 'draft',
        subtotal: invoiceData.subtotal || 0,
        tax_rate: invoiceData.tax_rate || 0,
        tax_amount: invoiceData.tax_amount || 0,
        total: invoiceData.total || 0,
        due_date: invoiceData.due_date || null,
        sent_at: invoiceData.sent_at || null,
        paid_at: invoiceData.paid_at || null,
        notes: invoiceData.notes || null,
        created_at: new Date().toISOString(),
      };
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_id: invoiceData.job_id,
          client_name: invoiceData.client_name,
          client_email: invoiceData.client_email,
          invoice_number: invoiceData.invoice_number || generateInvoiceNumber(),
          status: invoiceData.status || 'draft',
          subtotal: invoiceData.subtotal || 0,
          tax_rate: invoiceData.tax_rate || 0,
          tax_amount: invoiceData.tax_amount || 0,
          total: invoiceData.total || 0,
          due_date: invoiceData.due_date,
          notes: invoiceData.notes,
        }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setInvoices(prev => [result.data, ...prev]);
        return result.data;
      }
      throw new Error(result.error || 'Failed to create invoice');
    } catch (err) {
      console.error('Create invoice error:', err);
      setError('Failed to create invoice');
      return null;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<Invoice | null> => {
    if (isDemo || id.startsWith('inv-')) {
      setInvoices(prev => prev.map(inv =>
        inv.id === id ? { ...inv, ...updates } : inv
      ));
      return invoices.find(i => i.id === id) || null;
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setInvoices(prev => prev.map(inv => inv.id === id ? result.data : inv));
        return result.data;
      }
      throw new Error(result.error || 'Failed to update invoice');
    } catch (err) {
      console.error('Update invoice error:', err);
      setError('Failed to update invoice');
      return null;
    }
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    if (isDemo || id.startsWith('inv-')) {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      return true;
    }

    try {
      const res = await fetch(`/api/invoices?id=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.success) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        return true;
      }
      throw new Error(result.error || 'Failed to delete invoice');
    } catch (err) {
      console.error('Delete invoice error:', err);
      setError('Failed to delete invoice');
      return false;
    }
  };

  const getInvoice = async (id: string): Promise<Invoice | null> => {
    const localInvoice = invoices.find(i => i.id === id);
    if (localInvoice) return localInvoice;

    if (isDemo || id.startsWith('inv-')) {
      return demoInvoices.find(i => i.id === id) || null;
    }

    try {
      const res = await fetch(`/api/invoices?id=${id}&user_id=${userId}`);
      const result = await res.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('Get invoice error:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    isLoading,
    error,
    refresh: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoice,
    generateInvoiceNumber,
  };
}
