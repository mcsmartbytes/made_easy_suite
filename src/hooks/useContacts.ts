'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Contact } from '@/types/database';

interface UseContactsReturn {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createContact: (contact: Partial<Contact>) => Promise<Contact | null>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact | null>;
  deleteContact: (id: string) => Promise<boolean>;
  getContact: (id: string) => Promise<Contact | null>;
}

// Demo contacts matching crm_made_easy structure
const demoContacts: Contact[] = [
  {
    id: 'contact-1',
    user_id: 'demo',
    first_name: 'John',
    last_name: 'Smith',
    company: 'Smith Properties LLC',
    email: 'john@smithproperties.com',
    phone: '(555) 123-4567',
    mobile: '(555) 987-6543',
    address: '123 Main Street',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    type: 'customer',
    status: 'won',
    source: 'Referral',
    deal_value: 15000,
    notes: 'Long-term customer, always pays on time',
    last_contacted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-2',
    user_id: 'demo',
    first_name: 'Sarah',
    last_name: 'Johnson',
    company: 'ABC Corporation',
    email: 'sarah.j@abccorp.com',
    phone: '(555) 234-5678',
    mobile: null,
    address: '500 Business Park Dr',
    city: 'Springfield',
    state: 'IL',
    zip: '62702',
    type: 'prospect',
    status: 'proposal',
    source: 'Website',
    deal_value: 25000,
    notes: 'Interested in full parking lot resurfacing',
    last_contacted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-3',
    user_id: 'demo',
    first_name: 'Mike',
    last_name: 'Williams',
    company: null,
    email: 'mike.w@email.com',
    phone: '(555) 345-6789',
    mobile: '(555) 456-7890',
    address: '789 Oak Avenue',
    city: 'Springfield',
    state: 'IL',
    zip: '62703',
    type: 'lead',
    status: 'new',
    source: 'Google Ads',
    deal_value: 3500,
    notes: 'Requested quote for driveway sealing',
    last_contacted: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'contact-4',
    user_id: 'demo',
    first_name: 'Emily',
    last_name: 'Davis',
    company: 'City Mall LLC',
    email: 'emily@citymall.com',
    phone: '(555) 456-7890',
    mobile: null,
    address: '100 Mall Way',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    type: 'customer',
    status: 'won',
    source: 'Cold Call',
    deal_value: 45000,
    notes: 'Large commercial account - multi-phase project',
    last_contacted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-5',
    user_id: 'demo',
    first_name: 'Robert',
    last_name: 'Brown',
    company: 'Brown & Associates',
    email: 'rbrown@brownassoc.com',
    phone: '(555) 567-8901',
    mobile: null,
    address: '200 Professional Blvd',
    city: 'Springfield',
    state: 'IL',
    zip: '62705',
    type: 'lead',
    status: 'contacted',
    source: 'LinkedIn',
    deal_value: 8000,
    notes: 'Sent initial quote, waiting for response',
    last_contacted: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-6',
    user_id: 'demo',
    first_name: 'Lisa',
    last_name: 'Martinez',
    company: 'Riverfront HOA',
    email: 'lisa@riverfronthoa.com',
    phone: '(555) 678-9012',
    mobile: '(555) 789-0123',
    address: '200 River Road',
    city: 'Springfield',
    state: 'IL',
    zip: '62706',
    type: 'prospect',
    status: 'negotiation',
    source: 'Referral',
    deal_value: 35000,
    notes: 'Negotiating Phase 2 contract',
    last_contacted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-7',
    user_id: 'demo',
    first_name: 'David',
    last_name: 'Thompson',
    company: 'Thompson Builders',
    email: 'david@thompsonbuilders.com',
    phone: '(555) 890-1234',
    mobile: null,
    address: '500 Industrial Way',
    city: 'Springfield',
    state: 'IL',
    zip: '62707',
    type: 'vendor',
    status: 'won',
    source: 'Trade Show',
    deal_value: null,
    notes: 'Subcontractor for large projects',
    last_contacted: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-8',
    user_id: 'demo',
    first_name: 'Amanda',
    last_name: 'Clark',
    company: null,
    email: 'aclark@email.com',
    phone: '(555) 901-2345',
    mobile: null,
    address: '321 Elm Street',
    city: 'Springfield',
    state: 'IL',
    zip: '62708',
    type: 'lead',
    status: 'lost',
    source: 'Facebook',
    deal_value: 2500,
    notes: 'Went with competitor - price too high',
    last_contacted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function useContacts(userId: string | undefined): UseContactsReturn {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!userId) {
      setContacts(demoContacts);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Contacts fetch error:', fetchError);
        setContacts(demoContacts);
        setIsDemo(true);
      } else if (data && data.length > 0) {
        setContacts(data);
        setIsDemo(false);
      } else {
        setContacts(demoContacts);
        setIsDemo(true);
      }
    } catch (err) {
      console.error('Contacts fetch error:', err);
      setError('Failed to load contacts');
      setContacts(demoContacts);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createContact = async (contactData: Partial<Contact>): Promise<Contact | null> => {
    if (!userId || isDemo) {
      const newContact: Contact = {
        id: `contact-${Date.now()}`,
        user_id: userId || 'demo',
        first_name: contactData.first_name || 'New',
        last_name: contactData.last_name || null,
        company: contactData.company || null,
        email: contactData.email || null,
        phone: contactData.phone || null,
        mobile: contactData.mobile || null,
        address: contactData.address || null,
        city: contactData.city || null,
        state: contactData.state || null,
        zip: contactData.zip || null,
        type: contactData.type || 'lead',
        status: contactData.status || 'new',
        source: contactData.source || null,
        deal_value: contactData.deal_value || null,
        notes: contactData.notes || null,
        last_contacted: contactData.last_contacted || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setContacts(prev => [newContact, ...prev]);
      return newContact;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          company: contactData.company,
          email: contactData.email,
          phone: contactData.phone,
          mobile: contactData.mobile,
          address: contactData.address,
          city: contactData.city,
          state: contactData.state,
          zip: contactData.zip,
          type: contactData.type || 'lead',
          status: contactData.status || 'new',
          source: contactData.source,
          deal_value: contactData.deal_value,
          notes: contactData.notes,
          last_contacted: contactData.last_contacted,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setContacts(prev => [data, ...prev]);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Create contact error:', err);
      setError('Failed to create contact');
      return null;
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>): Promise<Contact | null> => {
    if (isDemo || id.startsWith('contact-')) {
      setContacts(prev => prev.map(contact =>
        contact.id === id
          ? { ...contact, ...updates, updated_at: new Date().toISOString() }
          : contact
      ));
      return contacts.find(c => c.id === id) || null;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (data) {
        setContacts(prev => prev.map(contact => contact.id === id ? data : contact));
        return data;
      }
      return null;
    } catch (err) {
      console.error('Update contact error:', err);
      setError('Failed to update contact');
      return null;
    }
  };

  const deleteContact = async (id: string): Promise<boolean> => {
    if (isDemo || id.startsWith('contact-')) {
      setContacts(prev => prev.filter(contact => contact.id !== id));
      return true;
    }

    try {
      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setContacts(prev => prev.filter(contact => contact.id !== id));
      return true;
    } catch (err) {
      console.error('Delete contact error:', err);
      setError('Failed to delete contact');
      return false;
    }
  };

  const getContact = async (id: string): Promise<Contact | null> => {
    const localContact = contacts.find(c => c.id === id);
    if (localContact) return localContact;

    if (isDemo || id.startsWith('contact-')) {
      return demoContacts.find(c => c.id === id) || null;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      console.error('Get contact error:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    isLoading,
    error,
    refresh: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    getContact,
  };
}
