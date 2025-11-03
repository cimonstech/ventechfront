/**
 * CSV Export Utility for VENTECH Admin Dashboard
 */

export interface CSVColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export class CSVExporter {
  /**
   * Convert data to CSV and trigger download
   */
  static export<T>(data: T[], columns: CSVColumn[], filename: string): void {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV header
    const headers = columns.map((col) => col.label).join(',');
    
    // Create CSV rows
    const rows = data.map((item) => {
      return columns
        .map((col) => {
          const value = (item as any)[col.key];
          const formattedValue = col.format ? col.format(value) : value;
          
          // Escape quotes and wrap in quotes if contains comma or quotes
          const stringValue = String(formattedValue ?? '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',');
    });

    // Combine header and rows
    const csv = [headers, ...rows].join('\n');
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Format currency for CSV export
   */
  static formatCurrency(value: number): string {
    return `GHC ${value.toFixed(2)}`;
  }

  /**
   * Format date for CSV export
   */
  static formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
  }

  /**
   * Format datetime for CSV export
   */
  static formatDateTime(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-GB');
  }

  /**
   * Format boolean for CSV export
   */
  static formatBoolean(value: boolean): string {
    return value ? 'Yes' : 'No';
  }
}

// Pre-defined column configurations for common entities

export const ProductColumns: CSVColumn[] = [
  { key: 'name', label: 'Product Name' },
  { key: 'sku', label: 'SKU' },
  { key: 'description', label: 'Description' },
  { key: 'key_features', label: 'Key Features', format: (v) => {
    if (!v) return 'N/A';
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed.join('; ') : parsed;
      } catch {
        return v;
      }
    }
    return Array.isArray(v) ? v.join('; ') : String(v);
  }},
  { key: 'specifications', label: 'Specifications', format: (v) => {
    if (!v) return 'N/A';
    if (typeof v === 'string') {
      try {
        return JSON.stringify(JSON.parse(v));
      } catch {
        return v;
      }
    }
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }},
  { key: 'price', label: 'Price', format: CSVExporter.formatCurrency },
  { key: 'discount_price', label: 'Discount Price', format: (v) => v ? CSVExporter.formatCurrency(v) : 'N/A' },
  { key: 'price_range', label: 'Price Range', format: (v) => {
    if (!v) return 'N/A';
    if (typeof v === 'object' && v.min !== undefined && v.max !== undefined) {
      if (v.min === v.max) return CSVExporter.formatCurrency(v.min);
      return `${CSVExporter.formatCurrency(v.min)} - ${CSVExporter.formatCurrency(v.max)}`;
    }
    return 'N/A';
  }},
  { key: 'stock_quantity', label: 'Stock' },
  { key: 'in_stock', label: 'In Stock', format: CSVExporter.formatBoolean },
  { key: 'category_name', label: 'Category' },
  { key: 'brand_name', label: 'Brand' },
  { key: 'is_featured', label: 'Featured', format: CSVExporter.formatBoolean },
  { key: 'rating', label: 'Rating', format: (v) => v ? v.toFixed(2) : '0.00' },
  { key: 'review_count', label: 'Review Count' },
  { key: 'images', label: 'Images', format: (v) => Array.isArray(v) ? v.join(' | ') : (v || 'N/A') },
  { key: 'thumbnail', label: 'Thumbnail' },
  { key: 'created_at', label: 'Created Date', format: CSVExporter.formatDate },
  { key: 'updated_at', label: 'Updated Date', format: CSVExporter.formatDate },
];

export const CustomerColumns: CSVColumn[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'newsletter_subscribed', label: 'Newsletter', format: CSVExporter.formatBoolean },
  { key: 'created_at', label: 'Registered', format: CSVExporter.formatDate },
];

export const OrderColumns: CSVColumn[] = [
  { key: 'order_number', label: 'Order Number' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'customer_email', label: 'Email' },
  { key: 'total_amount', label: 'Total', format: CSVExporter.formatCurrency },
  { key: 'status', label: 'Status' },
  { key: 'payment_status', label: 'Payment' },
  { key: 'created_at', label: 'Order Date', format: CSVExporter.formatDateTime },
];

export const TransactionColumns: CSVColumn[] = [
  { key: 'order_number', label: 'Order Number' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'amount', label: 'Amount', format: CSVExporter.formatCurrency },
  { key: 'payment_method', label: 'Payment Method' },
  { key: 'payment_status', label: 'Status' },
  { key: 'transaction_date', label: 'Date', format: CSVExporter.formatDateTime },
];


