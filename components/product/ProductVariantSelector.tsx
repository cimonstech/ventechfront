'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check } from 'lucide-react';
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

interface SelectedVariant {
  attributeId: string;
  attributeName: string;
  option: VariantOption;
}

interface ProductVariantSelectorProps {
  productId: string;
  basePrice: number;
  onVariantChange: (selectedVariants: SelectedVariant[], totalPrice: number) => void;
}

export function ProductVariantSelector({
  productId,
  basePrice,
  onVariantChange,
}: ProductVariantSelectorProps) {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [enabledGroups, setEnabledGroups] = useState<Set<string>>(new Set());
  const [selectedOptions, setSelectedOptions] = useState<Map<string, VariantOption>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductAttributes();
  }, [productId]);

  useEffect(() => {
    const totalPrice = calculateTotalPrice();
    const selectedVariants = Array.from(selectedOptions.entries()).map(([attributeId, option]) => {
      const attribute = attributes.find(attr => attr.id === attributeId);
      return {
        attributeId,
        attributeName: attribute?.name || '',
        option,
      };
    });
    onVariantChange(selectedVariants, totalPrice);
  }, [selectedOptions, enabledGroups]);

  const fetchProductAttributes = async () => {
    try {
      setLoading(true);

      // First, get attribute mappings to know which attributes are enabled for this product
      const { data: attributeMappings, error: mappingsError } = await supabase
        .from('product_attribute_mappings')
        .select('attribute_id, is_required, display_order')
        .eq('product_id', productId)
        .order('display_order');

      if (mappingsError) throw mappingsError;

      if (!attributeMappings || attributeMappings.length === 0) {
        setAttributes([]);
        setLoading(false);
        return;
      }

      const attributeIds = attributeMappings.map(m => m.attribute_id);

      // Get selected options for this product
      const { data: selectedOptions, error: selectedOptionsError } = await supabase
        .from('product_selected_options')
        .select('attribute_id, option_id')
        .eq('product_id', productId);

      if (selectedOptionsError) throw selectedOptionsError;

      // Group selected options by attribute_id
      const selectedOptionsByAttribute: { [key: string]: string[] } = {};
      (selectedOptions || []).forEach((item: any) => {
        if (!selectedOptionsByAttribute[item.attribute_id]) {
          selectedOptionsByAttribute[item.attribute_id] = [];
        }
        selectedOptionsByAttribute[item.attribute_id].push(item.option_id);
      });

      // Get attributes
      const { data: attributesData, error: attributesError } = await supabase
        .from('product_attributes')
        .select('*')
        .in('id', attributeIds)
        .order('display_order');

      if (attributesError) throw attributesError;

      if (!attributesData || attributesData.length === 0) {
        setAttributes([]);
        setLoading(false);
        return;
      }

      // Get options for each attribute - fetch ALL selected options
      const attributesWithOptions = await Promise.all(
        attributesData.map(async (attr: any) => {
          const selectedOptionIds = selectedOptionsByAttribute[attr.id] || [];
          
          if (selectedOptionIds.length === 0) {
            return null;
          }

          // Fetch ALL the selected options for this attribute
          const { data: options, error: optionsError } = await supabase
            .from('product_attribute_options')
            .select('*')
            .eq('attribute_id', attr.id)
            .in('id', selectedOptionIds)
            .order('display_order');

          if (optionsError) throw optionsError;

          // Ensure we have options
          if (!options || options.length === 0) {
            console.warn(`No options found for attribute ${attr.name} (${attr.id}) with selected option IDs:`, selectedOptionIds);
            return null;
          }

          // Debug: Log fetched options
          console.log(`Fetched ${options.length} options for attribute ${attr.name}:`, options.map(o => o.label || o.value));

          let finalOptions = options || [];

          // Find if there's a base option (price_modifier = 0)
          const hasBaseOption = finalOptions.some(opt => opt.price_modifier === 0);

          // If no base option exists, create a "Default" option
          if (!hasBaseOption && finalOptions.length > 0) {
            const defaultOption: VariantOption = {
              id: `default-${attr.id}`,
              value: 'default',
              label: `Default ${attr.name}`,
              price_modifier: 0,
              stock_quantity: 999999,
              sku_suffix: '',
              is_available: true,
            };
            finalOptions = [defaultOption, ...finalOptions];
          }

          const mapping = attributeMappings.find(m => m.attribute_id === attr.id);
          
          return {
            ...attr,
            is_required: mapping?.is_required || false,
            options: finalOptions,
          };
        })
      );

      const validAttributes = attributesWithOptions.filter((attr): attr is ProductAttribute => attr !== null);
      setAttributes(validAttributes);

      // Initialize with base options selected (price_modifier = 0)
      const initialSelections = new Map<string, VariantOption>();
      validAttributes.forEach((attr) => {
        const baseOption = attr.options.find(opt => opt.price_modifier === 0);
        if (baseOption) {
          initialSelections.set(attr.id, baseOption);
        } else if (attr.options.length > 0) {
          initialSelections.set(attr.id, attr.options[0]);
        }
      });
      setSelectedOptions(initialSelections);

    } catch (error: any) {
      console.error('Error fetching product attributes:', error);
      toast.error('Failed to load product options');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = (): number => {
    let total = basePrice;
    
    // Only add price modifiers for enabled groups
    enabledGroups.forEach((attributeId) => {
      const selectedOption = selectedOptions.get(attributeId);
      if (selectedOption) {
        total += selectedOption.price_modifier || 0;
      }
    });
    
    return total;
  };

  const toggleGroup = (attributeId: string) => {
    setEnabledGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(attributeId)) {
        newSet.delete(attributeId);
        // When disabling, reset to base option
        const attribute = attributes.find(attr => attr.id === attributeId);
        if (attribute) {
          const baseOption = attribute.options.find(opt => opt.price_modifier === 0);
          if (baseOption) {
            setSelectedOptions(prev => {
              const newMap = new Map(prev);
              newMap.set(attributeId, baseOption);
              return newMap;
            });
          }
        }
      } else {
        newSet.add(attributeId);
      }
      return newSet;
    });
  };

  const selectOption = (attributeId: string, option: VariantOption) => {
    setSelectedOptions((prev) => {
      const newMap = new Map(prev);
      newMap.set(attributeId, option);
      return newMap;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="h-20 bg-gray-200 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (attributes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Check the box to customize an option. Unchecked options use the default (base price).
        </p>
      </div>

      {attributes.map((attribute) => {
        const isEnabled = enabledGroups.has(attribute.id);
        const selectedOption = selectedOptions.get(attribute.id);

        return (
          <div key={attribute.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/* Group Header with Checkbox */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleGroup(attribute.id)}
                  className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19] cursor-pointer"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {attribute.name}
                      {attribute.is_required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    {isEnabled && selectedOption && selectedOption.price_modifier > 0 && (
                      <span className="text-xs font-semibold text-[#FF7A19]">
                        +GHS {selectedOption.price_modifier.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {!isEnabled && (
                    <span className="text-xs text-gray-500">Default (Base Price)</span>
                  )}
                  {isEnabled && selectedOption && (
                    <span className="text-xs text-[#FF7A19]">{selectedOption.label}</span>
                  )}
                </div>
              </label>
            </div>

            {/* Radio Options - Only shown when enabled */}
            {isEnabled && (
              <div className="p-4 space-y-2">
                {attribute.options.map((option) => {
                  const isSelected = selectedOption?.id === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => selectOption(attribute.id, option)}
                      className={`
                        w-full px-4 py-3 flex items-center justify-between rounded-lg text-left transition-all
                        ${isSelected
                          ? 'bg-orange-50 border-2 border-[#FF7A19]'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                            ${isSelected 
                              ? 'border-[#FF7A19] bg-[#FF7A19]' 
                              : 'border-gray-300 bg-white'
                            }
                          `}
                        >
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">
                            {option.label}
                          </p>
                          {option.price_modifier === 0 && (
                            <p className="text-xs text-gray-500">Base option</p>
                          )}
                        </div>
                      </div>
                      {option.price_modifier !== 0 && (
                        <span className="text-sm font-semibold text-[#FF7A19]">
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

      {/* Price Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-[#FF7A19]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#3A3A3A]">Base Price:</span>
          <span className="text-sm text-[#3A3A3A]">GHS {basePrice.toLocaleString()}</span>
        </div>
        
        {enabledGroups.size > 0 && (
          <>
            {Array.from(enabledGroups).map((attributeId) => {
              const selectedOption = selectedOptions.get(attributeId);
              const attribute = attributes.find(attr => attr.id === attributeId);
              
              if (!selectedOption || selectedOption.price_modifier === 0) return null;
              
              return (
                <div key={attributeId} className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#666666]">
                    + {attribute?.name}: {selectedOption.label}
                  </span>
                  <span className="text-xs font-semibold text-[#FF7A19]">
                    +GHS {selectedOption.price_modifier.toFixed(2)}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-orange-200 my-2"></div>
          </>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-[#1A1A1A]">Total Price:</span>
          <span className="text-xl font-bold text-[#FF7A19]">
            GHS {calculateTotalPrice().toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
