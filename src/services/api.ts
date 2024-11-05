import { supabase } from '../config/supabase';

export interface Timesheet {
  id: string;
  userId: string;
  date: string;
  hours: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  documents?: string[];
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  organizationId: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  organizationId: string;
  clientId?: string;
}

export const api = {
  timesheets: {
    async create(timesheet: Omit<Timesheet, 'id'>) {
      const { data, error } = await supabase
        .from('timesheets')
        .insert(timesheet)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async getByUser(userId: string) {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('userId', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Timesheet>) {
      const { data, error } = await supabase
        .from('timesheets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  clients: {
    async getAll(organizationId: string) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organizationId', organizationId);

      if (error) throw error;
      return data;
    },

    async create(client: Omit<Client, 'id'>) {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  employees: {
    async getAll(organizationId: string) {
      const { data, error } = await supabase
        .from('employees')
        .select('*, clients(*)')
        .eq('organizationId', organizationId);

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Employee>) {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }
}; 