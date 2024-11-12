import { supabase } from '../config/supabase';
import { encryptData, decryptData } from '../utils/encryption';

export const dataProtectionService = {
  // Data Access Request
  async requestDataAccess(userId: string) {
    try {
      // Collect all user data
      const userData = await this.collectUserData(userId);
      
      // Create data access request record
      const { error } = await supabase
        .from('data_access_requests')
        .insert({
          user_id: userId,
          status: 'pending',
          request_type: 'access',
          requested_at: new Date().toISOString()
        });

      if (error) throw error;
      
      return userData;
    } catch (error) {
      console.error('Data access request error:', error);
      throw error;
    }
  },

  // Right to be Forgotten
  async requestDataDeletion(userId: string) {
    try {
      // Create deletion request
      const { error } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: userId,
          status: 'pending',
          requested_at: new Date().toISOString()
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Data deletion request error:', error);
      throw error;
    }
  },

  // Data Portability
  async exportUserData(userId: string) {
    try {
      const userData = await this.collectUserData(userId);
      return this.formatDataForExport(userData);
    } catch (error) {
      console.error('Data export error:', error);
      throw error;
    }
  },

  // Data Collection Helper
  private async collectUserData(userId: string) {
    const [
      { data: userData },
      { data: timesheets },
      { data: documents },
      { data: personalInfo }
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('timesheets').select('*').eq('user_id', userId),
      supabase.from('employee_documents').select('*').eq('user_id', userId),
      supabase.from('employee_details').select('*').eq('user_id', userId)
    ]);

    return {
      userData,
      timesheets,
      documents,
      personalInfo
    };
  },

  // Data Export Formatter
  private formatDataForExport(data: any) {
    return {
      format: 'GDPR-compliant-export',
      timestamp: new Date().toISOString(),
      data: {
        personalInformation: data.userData,
        workRecords: data.timesheets,
        documents: data.documents.map((doc: any) => ({
          ...doc,
          file_url: undefined // Remove actual file URLs for security
        }))
      }
    };
  }
}; 