import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: {
    category: string;
    subcategory: string;
    amount: number;
    date: Date;
    note: string;
  }) => void;
  onAddRecurring: (recurring: {
    category: string;
    subcategory: string;
    amount: number;
    frequency: 'weekly' | 'monthly';
    startDate: Date;
    dayOfMonth?: number;
    dayOfWeek?: number;
    note: string;
  }) => void;
}

const CATEGORIES = ['Needs', 'Wants', 'Savings', 'Tithing'];

const SUBCATEGORIES: Record<string, string[]> = {
  Needs: ['Rent', 'Utilities', 'Groceries', 'Transportation', 'Insurance', 'Healthcare'],
  Wants: ['Dining', 'Entertainment', 'Shopping', 'Hobbies', 'Travel', 'Subscriptions'],
  Savings: ['Emergency Fund', 'Investments', 'Retirement', 'General Savings'],
  Tithing: ['Church', 'Charity', 'Donations'],
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AddTransactionDialog({ isOpen, onClose, onAdd, onAddRecurring }: AddTransactionDialogProps) {
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !subcategory || !amount) {
      return;
    }

    if (isRecurring) {
      onAddRecurring({
        category,
        subcategory,
        amount: parseFloat(amount),
        frequency,
        startDate: new Date(date),
        dayOfMonth: frequency === 'monthly' ? parseInt(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'weekly' ? parseInt(dayOfWeek) : undefined,
        note,
      });
    } else {
      onAdd({
        category,
        subcategory,
        amount: parseFloat(amount),
        date: new Date(date),
        note,
      });
    }

    // Reset form
    setCategory('');
    setSubcategory('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setIsRecurring(false);
    setFrequency('monthly');
    setDayOfMonth('1');
    setDayOfWeek('0');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(val) => {
              setCategory(val);
              setSubcategory('');
            }}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger id="subcategory">
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {SUBCATEGORIES[category]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between py-2 px-4 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="recurring" className="cursor-pointer">Make Recurring</Label>
              <p className="text-sm text-slate-500">Automatically repeat this transaction</p>
            </div>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(val: 'weekly' | 'monthly') => setFrequency(val)}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth">Day of Month</Label>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                    <SelectTrigger id="dayOfMonth">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              {isRecurring ? 'Create Recurring' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
