'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface VariantOption {
  id: string;
  value: string;
  label: string;
  price_modifier: number;
  stock_quantity: number;
  sku_suffix: string;
  is_available: boolean;
}

interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  type: 'select' | 'radio' | 'color' | 'size';
  is_required: boolean;
  options: VariantOption[];
}

interface ProductVariantSelectorProps {
  productId: string;
  basePrice: number;
  onVariantChange: (selectedVariants: { [key: string]: VariantOption }, totalPrice: number) => void;
}

export function ProductVariantSelector({
  productId,
  basePrice,
  onVariantChange,
}: ProductVariantSelectorProps) {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<{ [key: string]: VariantOption }>({});
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductAttributes();
  }, [productId]);

  useEffect(() => {
    const totalPrice = calculateTotalPrice();
    onVariantChange(selectedVariants, totalPrice);
  }, [selectedVariants]);

  const fetchProductAttributes = async () => {
    try {
      setLoading(true);

      // Get product attribute mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('product_attribute_mappings')
        .select('attribute_id, is_required, display_order')
        .eq('product_id', productId)
        .order('display_order');

      if (mappingsError) throw mappingsError;

      if (!mappings || mappings.length === 0) {
        setAttributes([]);
        setLoading(false);
        return;
      }

      // Get attributes with their options
      const attributeIds = mappings.map((m: any) => m.attribute_id);
      const { data: attributesData, error: attributesError } = await supabase
        .from('product_attributes')
        .select('*')
        .in('id', attributeIds)
        .order('display_order');

      if (attributesError) throw attributesError;

      // Get options for each attribute
      const attributesWithOptions = await Promise.all(
        attributesData.map(async (attr: any) => {
          const { data: options, error: optionsError } = await supabase
            .from('product_attribute_options')
            .select('*')
            .eq('attribute_id', attr.id)
            .eq('is_available', true)
            .order('display_order');

          if (optionsError) throw optionsError;

          const mapping = mappings.find((m: any) => m.attribute_id === attr.id);

          return {
            ...attr,
            is_required: mapping?.is_required || false,
            options: options || [],
          };
        })
      );

      setAttributes(attributesWithOptions);

      // Auto-select first option for required attributes
      const initialSelection: { [key: string]: VariantOption } = {};
      attributesWithOptions.forEach((attr) => {
        if (attr.options.length > 0) {
          initialSelection[attr.id] = attr.options[0];
        }
      });
      setSelectedVariants(initialSelection);
    } catch (error: any) {
      console.error('Error fetching product attributes:', error);
      toast.error('Failed to load product variants');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = (): number => {
    let total = basePrice;
    Object.values(selectedVariants).forEach((variant) => {
      total += variant.price_modifier;
    });
    return total;
  };

  const handleVariantSelect = (attributeId: string, option: VariantOption) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [attributeId]: option,
    }));
  };

  const toggleAttribute = (attributeId: string) => {
    setExpandedAttributes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(attributeId)) {
        newSet.delete(attributeId);
      } else {
        newSet.add(attributeId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="h-12 bg-gray-200 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (attributes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {attributes.map((attribute) => {
        const isExpanded = expandedAttributes.has(attribute.id);
        const selectedOption = selectedVariants[attribute.id];

        return (
          <div key={attribute.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Dropdown Header */}
            <button
              onClick={() => toggleAttribute(attribute.id)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#1A1A1A]">
                  {attribute.name}
                  {attribute.is_required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {selectedOption && (
                  <span className="text-xs text-[#FF7A19] font-medium">
                    ({selectedOption.label})
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Radio Options - Shown when expanded */}
            {isExpanded && (
              <div className="p-3 space-y-2 bg-white border-t border-gray-200">
                {attribute.options.map((option) => {
                  const isSelected = selectedVariants[attribute.id]?.id === option.id;
                  const isOutOfStock = option.stock_quantity === 0;

                  return (
                    <button
                      key={option.id}
                      onClick={() => !isOutOfStock && handleVariantSelect(attribute.id, option)}
                      disabled={isOutOfStock}
                      className={`
                        w-full px-3 py-2 flex items-center justify-between rounded-lg text-left transition-all
                        ${isSelected
                          ? 'bg-orange-50 border-2 border-[#FF7A19]'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                        }
                        ${isOutOfStock
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                            w-4 h-4 rounded-full border-2 flex items-center justify-center
                            ${isSelected ? 'border-[#FF7A19]' : 'border-gray-300'}
                          `}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-[#FF7A19]"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{option.label}</p>
                          {isOutOfStock && (
                            <p className="text-xs text-red-500">Out of Stock</p>
                          )}
                        </div>
                      </div>
                      {option.price_modifier !== 0 && (
                        <span className="text-xs font-semibold text-[#FF7A19]">
                          {option.price_modifier > 0 ? '+' : ''}GHS {option.price_modifier.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Price Summary - Compact */}
      {Object.keys(selectedVariants).length > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#3A3A3A]">Total Price:</span>
            <span className="text-lg font-bold text-[#FF7A19]">
              GHS {calculateTotalPrice().toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


