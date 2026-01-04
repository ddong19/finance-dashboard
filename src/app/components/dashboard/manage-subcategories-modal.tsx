import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import {
  fetchCategories,
  fetchSubcategories,
  getOrCreateMonth,
  fetchAllSubcategoryVisibility,
  setSubcategoryVisibility,
  Category,
  Subcategory,
} from '../../../lib/database';

interface ManageSubcategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  onVisibilityChange?: () => void;
}

export function ManageSubcategoriesModal({
  isOpen,
  onClose,
  selectedMonth,
  onVisibilityChange,
}: ManageSubcategoriesModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<number>>(new Set());

  // Load data when modal opens or month changes
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [year, month] = selectedMonth.split('-');

        // Get or create month record
        const monthRecord = await getOrCreateMonth(parseInt(year), parseInt(month));

        // Fetch categories, subcategories, and visibility settings
        const [cats, subs, visibility] = await Promise.all([
          fetchCategories(),
          fetchSubcategories(),
          fetchAllSubcategoryVisibility(monthRecord.id),
        ]);

        setCategories(cats);
        setSubcategories(subs);

        // Build visibility map
        const visMap: Record<number, boolean> = {};
        subs.forEach(sub => {
          const visRecord = visibility.find(v => v.subcategory_id === sub.id);
          // Default to true if no visibility record exists
          visMap[sub.id] = visRecord ? visRecord.is_visible : true;
        });
        setVisibilityMap(visMap);
      } catch (error) {
        console.error('Error loading subcategories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, selectedMonth]);

  // Handle visibility toggle with auto-save
  const handleToggleVisibility = async (subcategoryId: number, newValue: boolean | 'indeterminate') => {
    // Convert the checked state to a boolean (handle indeterminate)
    const isVisible = newValue === true;

    try {
      setSaving(prev => new Set(prev).add(subcategoryId));

      // Optimistically update UI
      setVisibilityMap(prev => ({
        ...prev,
        [subcategoryId]: isVisible,
      }));

      const [year, month] = selectedMonth.split('-');
      const monthRecord = await getOrCreateMonth(parseInt(year), parseInt(month));

      await setSubcategoryVisibility(monthRecord.id, subcategoryId, isVisible);

      // Notify parent to refresh data
      if (onVisibilityChange) {
        onVisibilityChange();
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      // Revert on error
      setVisibilityMap(prev => ({
        ...prev,
        [subcategoryId]: !isVisible,
      }));
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(subcategoryId);
        return next;
      });
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage Subcategories
          </DialogTitle>
          <DialogDescription>
            Toggle visibility for subcategories in {formatMonth(selectedMonth)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {categories.map(category => {
                const categorySubs = subcategories
                  .filter(sub => sub.category_id === category.id)
                  .sort((a, b) => a.display_order - b.display_order);

                if (categorySubs.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground border-b border-border pb-2">
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categorySubs.map(sub => {
                        const isVisible = visibilityMap[sub.id] ?? true;
                        const isSaving = saving.has(sub.id);

                        return (
                          <div
                            key={sub.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors ${
                              isSaving ? 'opacity-50' : ''
                            }`}
                          >
                            <Checkbox
                              id={`subcategory-${sub.id}`}
                              checked={isVisible}
                              onCheckedChange={(checked) =>
                                handleToggleVisibility(sub.id, checked)
                              }
                              disabled={isSaving}
                            />
                            <label
                              htmlFor={`subcategory-${sub.id}`}
                              className="text-sm flex-1 cursor-pointer select-none"
                            >
                              {sub.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
