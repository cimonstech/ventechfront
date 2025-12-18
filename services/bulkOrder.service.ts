export interface BulkOrderFormData {
  // Contact Info
  name: string;
  phone: string;
  email: string;
  organization?: string;
  
  // Product Details
  productType: string;
  quantity: string;
  preferredSpecs?: string;
  
  // Delivery & Payment
  deliveryLocation: string;
  paymentMethod: string;
  preferredDeliveryDate?: string;
  
  // Notes
  notes?: string;
}

export const bulkOrderService = {
  // Submit bulk order request
  async submitBulkOrderRequest(data: BulkOrderFormData): Promise<{ success: boolean; error?: string }> {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/bulk-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit bulk order request');
      }

      return { success: true };
    } catch (error) {
      console.error('Error submitting bulk order request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit request' 
      };
    }
  },
};

