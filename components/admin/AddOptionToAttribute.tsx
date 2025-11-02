'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface AddOptionToAttributeProps {
  attributeId: string;
  attributeName: string;
  onAdd: (attributeId: string, value: string, label: string, priceModifier: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function AddOptionToAttribute({ attributeId, attributeName, onAdd, onRefresh }: AddOptionToAttributeProps) {
  const [showForm, setShowForm] = useState(false);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [priceModifier, setPriceModifier] = useState('0');
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!value.trim() || !label.trim()) {
      toast.error('Please enter both value and label');
      return;
    }

    setAdding(true);
    try {
      await onAdd(attributeId, value.trim(), label.trim(), parseFloat(priceModifier) || 0);
      await onRefresh();
      setValue('');
      setLabel('');
      setPriceModifier('0');
      setShowForm(false);
    } catch (error) {
      // Error handled in parent
    } finally {
      setAdding(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#FF7A19] transition-colors text-sm text-[#3A3A3A] flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Custom Value
      </button>
    );
  }

  return (
    <div className="p-3 border-2 border-[#FF7A19] rounded-lg bg-orange-50">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">Add New Value for {attributeName}</p>
        <button
          onClick={() => {
            setShowForm(false);
            setValue('');
            setLabel('');
            setPriceModifier('0');
          }}
          className="p-1 hover:bg-white rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            placeholder="Value (e.g., 32GB, Red, 2 Years)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
            required
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Label (e.g., 32GB RAM, Red Color, 2 Years Warranty)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
            required
          />
        </div>
        <div>
          <input
            type="number"
            step="0.01"
            placeholder="Price Adjustment (e.g., 50.00 for +GHS 50)"
            value={priceModifier}
            onChange={(e) => setPriceModifier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
          />
          <p className="text-xs text-[#3A3A3A] mt-1">
            Enter positive number for price increase, negative for decrease, or 0 for no change
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={adding}
            className="flex-1"
          >
            {adding ? 'Adding...' : 'Add Value'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowForm(false);
              setValue('');
              setLabel('');
              setPriceModifier('0');
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

