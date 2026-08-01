import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Minus, Pencil, Plus } from 'lucide-react';
import { REASON_CODES, STOCK_LOCATIONS, type StockLocation, type StockRecord } from './inventoryData';

const adjustSchema = z.object({
  partId: z.string().min(1, 'Select a part'),
  location: z.string().min(1, 'Select a location'),
  direction: z.enum(['add', 'remove']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  reasonCode: z.string().min(1, 'Reason code is required'),
  note: z.string().max(300, 'Note must be less than 300 characters').optional(),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

export interface AdjustQuantityInput {
  partId: string;
  location: StockLocation;
  direction: 'add' | 'remove';
  quantity: number;
  reasonCode: string;
  note?: string;
}

interface AdjustQuantityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockRecord[];
  onAdjust: (input: AdjustQuantityInput) => void;
}

export function AdjustQuantityDialog({ isOpen, onClose, stock, onAdjust }: AdjustQuantityDialogProps) {
  const [selectedRecord, setSelectedRecord] = useState<StockRecord | null>(null);
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const form = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      partId: '',
      location: '',
      direction: 'add',
      quantity: 1,
      reasonCode: '',
      note: '',
    },
  });

  const isFormDirty = form.formState.isDirty;

  const resetAndClose = () => {
    form.reset();
    setSelectedRecord(null);
    onClose();
  };

  const attemptClose = () => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const handleSubmit = (data: AdjustFormData) => {
    if (!selectedRecord) {
      toast.error('Select a part to adjust');
      return;
    }
    onAdjust({
      partId: selectedRecord.partId,
      location: data.location as StockLocation,
      direction: data.direction,
      quantity: data.quantity,
      reasonCode: data.reasonCode,
      note: data.note?.trim() || undefined,
    });
    resetAndClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent className="max-w-lg p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex-row items-start gap-3 space-y-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pencil className="h-4 w-4" />
          </div>
          <div className="text-left">
            <DialogTitle>Adjust quantity</DialogTitle>
            <DialogDescription>Writes one immutable ledger entry</DialogDescription>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="partId"
                  render={() => (
                    <FormItem>
                      <FormLabel>Part *</FormLabel>
                      <Popover open={partPickerOpen} onOpenChange={setPartPickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'w-full justify-between font-normal',
                                !selectedRecord && 'text-muted-foreground'
                              )}
                            >
                              {selectedRecord ? `${selectedRecord.pn} — ${selectedRecord.name}` : 'Select a part...'}
                              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[420px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search stocked parts..." />
                            <CommandList>
                              <CommandEmpty>No stocked parts found.</CommandEmpty>
                              <CommandGroup>
                                {stock.map((r) => (
                                  <CommandItem
                                    key={r.id}
                                    value={`${r.pn} ${r.name}`}
                                    onSelect={() => {
                                      setSelectedRecord(r);
                                      form.setValue('partId', r.partId, { shouldDirty: true, shouldValidate: true });
                                      form.setValue('location', r.location, { shouldDirty: true, shouldValidate: true });
                                      setPartPickerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        selectedRecord?.id === r.id ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm truncate">{r.pn} — {r.name}</span>
                                      <span className="text-xs text-muted-foreground truncate">
                                        {r.location} · On hand {r.onHand}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a location..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STOCK_LOCATIONS.map((loc) => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direction</FormLabel>
                        <FormControl>
                          <ToggleGroup
                            type="single"
                            value={field.value}
                            onValueChange={(v) => v && field.onChange(v)}
                            className="justify-start border rounded-md p-1"
                          >
                            <ToggleGroupItem value="add" className="gap-1.5 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                              <Plus className="h-3.5 w-3.5" /> Add
                            </ToggleGroupItem>
                            <ToggleGroupItem value="remove" className="gap-1.5 flex-1 data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground">
                              <Minus className="h-3.5 w-3.5" /> Remove
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reasonCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason code *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REASON_CODES.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Required — adjustments are audited.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note <span className="text-muted-foreground font-normal">optional</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional note..." className="min-h-[70px] resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0">
              <Button type="button" variant="outline" onClick={attemptClose}>Cancel</Button>
              <Button type="submit" disabled={!selectedRecord}>Post adjustment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <ConfirmationDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        onConfirm={resetAndClose}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="destructive"
      />
    </Dialog>
  );
}
