import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogClose,
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
import { Check, ChevronsUpDown, Minus, Pencil, Plus, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { REASON_CODES, LocationCombobox, type StockLocation, type StockRecord } from './inventoryData';

const adjustSchema = z.object({
  partId: z.string().min(1, 'Select a part'),
  location: z.string().min(1, 'Select a location'),
  direction: z.enum(['add', 'remove']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  reasonCode: z.string().min(1, 'Reason code is required'),
  note: z.string().max(300, 'Note must be less than 300 characters').optional(),
  lotNumber: z.string().max(60, 'Lot number must be less than 60 characters').optional(),
  serialNumber: z.string().max(60, 'Serial number must be less than 60 characters').optional(),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

export interface AdjustQuantityInput {
  partId: string;
  location: StockLocation;
  direction: 'add' | 'remove';
  quantity: number;
  reasonCode: string;
  note?: string;
  lotNumber?: string;
  serialNumber?: string;
}

interface AdjustQuantityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockRecord[];
  onAdjust: (input: AdjustQuantityInput) => void;
  /** Preselect a part (e.g. opened from that part's detail sheet) instead of starting on the picker. */
  initialPartId?: string;
}

export function AdjustQuantityDialog({ isOpen, onClose, stock, onAdjust, initialPartId }: AdjustQuantityDialogProps) {
  const isMobile = useIsMobile();
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
      lotNumber: '',
      serialNumber: '',
    },
  });

  useEffect(() => {
    if (isOpen && initialPartId) {
      const match = stock.find(r => r.partId === initialPartId);
      if (match) {
        setSelectedRecord(match);
        form.setValue('partId', match.partId, { shouldValidate: true });
        form.setValue('location', match.location, { shouldValidate: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPartId]);

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
      lotNumber: data.lotNumber?.trim() || undefined,
      serialNumber: data.serialNumber?.trim() || undefined,
    });
    resetAndClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && attemptClose()}>
      <DialogContent
        hideClose
        className={cn(
          'p-0 flex flex-col gap-0',
          isMobile
            ? 'inset-0 left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-top-0 data-[state=closed]:!slide-out-to-left-0 data-[state=closed]:!slide-out-to-top-0'
            : 'max-w-lg'
        )}
      >
        <DialogHeader className="px-4 sm:px-6 py-4 pr-10 border-b shrink-0 flex-row items-start gap-3 space-y-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Pencil className="h-4 w-4" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <DialogTitle>Adjust quantity</DialogTitle>
            <DialogDescription>Writes one immutable ledger entry</DialogDescription>
          </div>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1">
              <div className="p-4 sm:p-6 space-y-5">
                <FormField
                  control={form.control}
                  name="partId"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Part <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
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
                        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[420px] p-0" align="start">
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
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
                      <FormControl>
                        <LocationCombobox value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lot number <span className="normal-case font-normal">optional</span></FormLabel>
                        <FormControl>
                          <Input placeholder="LOT-…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serial number <span className="normal-case font-normal">optional</span></FormLabel>
                        <FormControl>
                          <Input placeholder="SN-…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground -mt-3">
                  Both fields are available on every part while the hardware team decides which applies where.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Direction</FormLabel>
                        <FormControl>
                          <ToggleGroup
                            type="single"
                            value={field.value}
                            onValueChange={(v) => v && field.onChange(v)}
                            className="justify-start gap-2"
                          >
                            <ToggleGroupItem
                              value="add"
                              variant="outline"
                              className="gap-1.5 flex-1 border-input data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="remove"
                              variant="outline"
                              className="gap-1.5 flex-1 border-input data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground data-[state=on]:border-destructive"
                            >
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
                        <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
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
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason code <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
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
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Note <span className="normal-case font-normal">optional</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional note..." className="min-h-[70px] resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex-row justify-end gap-2 space-x-0 sm:space-x-0 px-4 sm:px-6 py-4 border-t shrink-0">
              <Button type="button" variant="outline" className="flex-1" onClick={attemptClose}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={!selectedRecord}>Post adjustment</Button>
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
