'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Expense, Category } from '@/types/database';

interface UseExpensesReturn {
  expenses: Expense[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createExpense: (expense: Partial<Expense>) => Promise<Expense | null>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense | null>;
  deleteExpense: (id: string) => Promise<boolean>;
  getExpense: (id: string) => Promise<Expense | null>;
}

// Demo categories
const demoCategories: Category[] = [
  { id: 'cat-1', user_id: null, name: 'Materials', icon: 'Package', color: 'blue', deduction_percentage: 100, is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-2', user_id: null, name: 'Labor', icon: 'Users', color: 'green', deduction_percentage: 100, is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-3', user_id: null, name: 'Equipment', icon: 'Wrench', color: 'purple', deduction_percentage: 100, is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-4', user_id: null, name: 'Fuel', icon: 'Fuel', color: 'orange', deduction_percentage: 100, is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-5', user_id: null, name: 'Subcontractor', icon: 'HardHat', color: 'yellow', deduction_percentage: 100, is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-6', user_id: null, name: 'Office Supplies', icon: 'Paperclip', color: 'gray', deduction_percentage: 100, is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-7', user_id: null, name: 'Meals', icon: 'Utensils', color: 'red', deduction_percentage: 50, is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-8', user_id: null, name: 'Travel', icon: 'Car', color: 'teal', deduction_percentage: 100, is_default: true, created_at: new Date().toISOString() },
];

// Demo expenses
const demoExpenses: Expense[] = [
  {
    id: 'exp-1',
    user_id: 'demo',
    job_id: 'demo-1',
    category_id: 'cat-1',
    description: 'Sealcoating material - 55 gallon drum',
    amount: 450,
    date: new Date().toISOString().split('T')[0],
    vendor: 'Asphalt Supply Co',
    payment_method: 'Business Card',
    is_business: true,
    receipt_url: null,
    notes: null,
    created_at: new Date().toISOString(),
    category_name: 'Materials',
    job_name: 'Johnson Residence - Driveway Seal',
  },
  {
    id: 'exp-2',
    user_id: 'demo',
    job_id: 'demo-1',
    category_id: 'cat-4',
    description: 'Diesel fuel for equipment',
    amount: 125.50,
    date: new Date().toISOString().split('T')[0],
    vendor: 'Shell Gas Station',
    payment_method: 'Business Card',
    is_business: true,
    receipt_url: null,
    notes: null,
    created_at: new Date().toISOString(),
    category_name: 'Fuel',
    job_name: 'Johnson Residence - Driveway Seal',
  },
  {
    id: 'exp-3',
    user_id: 'demo',
    job_id: 'demo-2',
    category_id: 'cat-5',
    description: 'Subcontractor - Striping crew',
    amount: 1200,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendor: 'ABC Striping LLC',
    payment_method: 'Check',
    is_business: true,
    receipt_url: null,
    notes: 'Invoice #2847',
    created_at: new Date().toISOString(),
    category_name: 'Subcontractor',
    job_name: 'ABC Corp Parking Lot',
  },
  {
    id: 'exp-4',
    user_id: 'demo',
    job_id: null,
    category_id: 'cat-6',
    description: 'Printer paper and ink',
    amount: 89.99,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendor: 'Office Depot',
    payment_method: 'Business Card',
    is_business: true,
    receipt_url: null,
    notes: null,
    created_at: new Date().toISOString(),
    category_name: 'Office Supplies',
  },
  {
    id: 'exp-5',
    user_id: 'demo',
    job_id: 'demo-5',
    category_id: 'cat-3',
    description: 'Equipment rental - Crack filler machine',
    amount: 350,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendor: 'United Rentals',
    payment_method: 'Business Card',
    is_business: true,
    receipt_url: null,
    notes: '3-day rental',
    created_at: new Date().toISOString(),
    category_name: 'Equipment',
    job_name: 'Riverfront Condos - Phase 1',
  },
  {
    id: 'exp-6',
    user_id: 'demo',
    job_id: null,
    category_id: 'cat-7',
    description: 'Team lunch meeting',
    amount: 78.45,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendor: 'Olive Garden',
    payment_method: 'Business Card',
    is_business: true,
    receipt_url: null,
    notes: 'Weekly planning meeting',
    created_at: new Date().toISOString(),
    category_name: 'Meals',
  },
];

export function useExpenses(userId: string | undefined): UseExpensesReturn {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!userId) {
      setExpenses(demoExpenses);
      setCategories(demoCategories);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [expensesResult, categoriesResult] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            categories (name),
            jobs (name)
          `)
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .or(`user_id.eq.${userId},is_default.eq.true`)
          .order('name'),
      ]);

      if (expensesResult.error) {
        console.error('Expenses fetch error:', expensesResult.error);
        setExpenses(demoExpenses);
        setIsDemo(true);
      } else if (expensesResult.data && expensesResult.data.length > 0) {
        const processedExpenses = expensesResult.data.map((exp: Record<string, unknown>) => ({
          ...exp,
          category_name: (exp.categories as { name?: string } | null)?.name || null,
          job_name: (exp.jobs as { name?: string } | null)?.name || null,
        })) as Expense[];
        setExpenses(processedExpenses);
        setIsDemo(false);
      } else {
        setExpenses(demoExpenses);
        setIsDemo(true);
      }

      if (categoriesResult.error) {
        console.error('Categories fetch error:', categoriesResult.error);
        setCategories(demoCategories);
      } else {
        setCategories(categoriesResult.data || demoCategories);
      }
    } catch (err) {
      console.error('Expenses fetch error:', err);
      setError('Failed to load expenses');
      setExpenses(demoExpenses);
      setCategories(demoCategories);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createExpense = async (expenseData: Partial<Expense>): Promise<Expense | null> => {
    if (!userId || isDemo) {
      const category = categories.find(c => c.id === expenseData.category_id);
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        user_id: userId || 'demo',
        job_id: expenseData.job_id || null,
        category_id: expenseData.category_id || null,
        description: expenseData.description || 'New Expense',
        amount: expenseData.amount || 0,
        date: expenseData.date || new Date().toISOString().split('T')[0],
        vendor: expenseData.vendor || null,
        payment_method: expenseData.payment_method || null,
        is_business: expenseData.is_business ?? true,
        receipt_url: expenseData.receipt_url || null,
        notes: expenseData.notes || null,
        created_at: new Date().toISOString(),
        category_name: category?.name || null,
      };
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          job_id: expenseData.job_id,
          category_id: expenseData.category_id,
          description: expenseData.description,
          amount: expenseData.amount,
          date: expenseData.date,
          vendor: expenseData.vendor,
          payment_method: expenseData.payment_method,
          is_business: expenseData.is_business ?? true,
          receipt_url: expenseData.receipt_url,
          notes: expenseData.notes,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const category = categories.find(c => c.id === data.category_id);
        const newExpense = { ...data, category_name: category?.name || null };
        setExpenses(prev => [newExpense, ...prev]);
        return newExpense;
      }
      return null;
    } catch (err) {
      console.error('Create expense error:', err);
      setError('Failed to create expense');
      return null;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>): Promise<Expense | null> => {
    if (isDemo || id.startsWith('exp-')) {
      const category = categories.find(c => c.id === updates.category_id);
      setExpenses(prev => prev.map(exp =>
        exp.id === id
          ? { ...exp, ...updates, category_name: category?.name || exp.category_name }
          : exp
      ));
      return expenses.find(e => e.id === id) || null;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (data) {
        const category = categories.find(c => c.id === data.category_id);
        const updatedExpense = { ...data, category_name: category?.name || null };
        setExpenses(prev => prev.map(exp => exp.id === id ? updatedExpense : exp));
        return updatedExpense;
      }
      return null;
    } catch (err) {
      console.error('Update expense error:', err);
      setError('Failed to update expense');
      return null;
    }
  };

  const deleteExpense = async (id: string): Promise<boolean> => {
    if (isDemo || id.startsWith('exp-')) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      return true;
    }

    try {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setExpenses(prev => prev.filter(exp => exp.id !== id));
      return true;
    } catch (err) {
      console.error('Delete expense error:', err);
      setError('Failed to delete expense');
      return false;
    }
  };

  const getExpense = async (id: string): Promise<Expense | null> => {
    const localExpense = expenses.find(e => e.id === id);
    if (localExpense) return localExpense;

    if (isDemo || id.startsWith('exp-')) {
      return demoExpenses.find(e => e.id === id) || null;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('*, categories (name), jobs (name)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        return {
          ...data,
          category_name: data.categories?.name || null,
          job_name: data.jobs?.name || null,
        } as Expense;
      }
      return null;
    } catch (err) {
      console.error('Get expense error:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    categories,
    isLoading,
    error,
    refresh: fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpense,
  };
}
