import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Save, X } from 'lucide-react';
import { Subcategory } from '../../dashboard-types';
import { CATEGORIES } from '../../dashboard-data';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface CategoriesTabProps {
  subcategories: Subcategory[];
  onAddSubcategory: (subcategory: Omit<Subcategory, 'id'>) => void;
  onUpdateSubcategory: (id: string, subcategory: Partial<Subcategory>) => void;
  onDeleteSubcategory: (id: string) => void;
  onReorderSubcategories: (categoryId: string, subcategoryIds: string[]) => void;
}

export function CategoriesTab({
  subcategories,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onReorderSubcategories,
}: CategoriesTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSubcategory, setNewSubcategory] = useState({
    name: '',
    categoryId: 'cat-income',
  });
  const [editForm, setEditForm] = useState({
    name: '',
  });
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newSubcategory.name.trim()) return;

    const categorySubs = subcategories.filter((s) => s.categoryId === newSubcategory.categoryId);
    const maxSortOrder = categorySubs.length > 0 ? Math.max(...categorySubs.map((s) => s.sortOrder)) : 0;

    onAddSubcategory({
      name: newSubcategory.name,
      categoryId: newSubcategory.categoryId,
      sortOrder: maxSortOrder + 1,
    });

    setNewSubcategory({ name: '', categoryId: 'cat-needs' });
    setIsAdding(false);
  };

  const handleEdit = (sub: Subcategory) => {
    setEditingId(sub.id);
    setEditForm({
      name: sub.name,
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;

    onUpdateSubcategory(id, {
      name: editForm.name,
    });

    setEditingId(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string, categoryId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetId) return;

    const categorySubs = subcategories
      .filter((s) => s.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const draggedIndex = categorySubs.findIndex((s) => s.id === draggedItem);
    const targetIndex = categorySubs.findIndex((s) => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...categorySubs];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    onReorderSubcategories(
      categoryId,
      reordered.map((s) => s.id)
    );

    setDraggedItem(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Manage Categories</h2>
          <p className="text-muted-foreground">Add, edit, or reorder subcategories</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Subcategory
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-accent/50 border border-border rounded-lg p-5 shadow-sm">
          <h3>Add New Subcategory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newSubcategory.categoryId}
                onValueChange={(val) => setNewSubcategory({ ...newSubcategory, categoryId: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory Name</Label>
              <Input
                placeholder="e.g., Groceries"
                value={newSubcategory.name}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Category Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CATEGORIES.map((category) => {
          const categorySubs = subcategories
            .filter((s) => s.categoryId === category.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <div key={category.id} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-accent/30 border-b border-border">
                <h3 className="text-sm font-medium">{category.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder</p>
              </div>
              <div className="divide-y divide-border/50">
                {categorySubs.length > 0 ? (
                  categorySubs.map((sub) => (
                    <div
                      key={sub.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, sub.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, sub.id, category.id)}
                      className={`px-4 py-4 hover:bg-accent/10 cursor-move ${
                        draggedItem === sub.id ? 'opacity-50' : ''
                      }`}
                    >
                      {editingId === sub.id ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(sub.id)}
                              className="h-7 text-xs bg-primary hover:bg-primary/90"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <div className="font-medium">{sub.name}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(sub)}
                              className="p-1.5 hover:bg-accent rounded transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => onDeleteSubcategory(sub.id)}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No subcategories yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}