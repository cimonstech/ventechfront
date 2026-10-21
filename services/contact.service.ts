import { supabase } from '@/lib/supabase';

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const contactService = {
  // Submit contact form
  async submitContactForm(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send message');
      }

      return { success: true };
    } catch (error) {
      console.error('Error submitting contact form:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      };
    }
  },

  // Store contact form in database (optional - for admin tracking)
  async storeContactMessage(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          subject: data.subject,
          message: data.message,
          status: 'new',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error storing contact message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to store message' 
      };
    }
  }
};
