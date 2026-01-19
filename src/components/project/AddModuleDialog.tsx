import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Module, ModuleType, TeamMember } from '@/types';
import { formatModuleType, getModuleColor } from '@/lib/projectUtils';
import { cn } from '@/lib/utils';

interface AddModuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (module: Omit<Module, 'id' | 'createdAt'>) => void;
  teamMembers: TeamMember[];
  existingModuleNames?: string[];
}

const moduleTypes: ModuleType[] = [
  'hardware', 'software', 'firmware', 'testing', 'design',
  'procurement', 'manufacturing', 'qa', 'logistics', 'enclosure', 'pcb', 'power'
];

const moduleColorPresets: { type: ModuleType; color: string }[] = [
  { type: 'pcb', color: '#3B82F6' },
  { type: 'enclosure', color: '#10B981' },
  { type: 'firmware', color: '#8B5CF6' },
  { type: 'procurement', color: '#F59E0B' },
  { type: 'software', color: '#EC4899' },
  { type: 'qa', color: '#EF4444' },
  { type: 'hardware', color: '#0EA5E9' },
  { type: 'design', color: '#06B6D4' },
  { type: 'manufacturing', color: '#22C55E' },
  { type: 'testing', color: '#F97316' },
  { type: 'logistics', color: '#64748B' },
  { type: 'power', color: '#A855F7' },
];

export function AddModuleDialog({
  isOpen,
  onClose,
  onAdd,
  teamMembers,
  existingModuleNames = [],
}: AddModuleDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ModuleType>('hardware');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [customColor, setCustomColor] = useState<string>('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleTypeChange = (newType: ModuleType) => {
    setType(newType);
    setCustomColor(''); // Reset to default color for new type
  };

  const getSelectedColor = () => {
    if (customColor) return customColor;
    return getModuleColor(type);
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Module name is required';
    } else if (existingModuleNames.some(n => n.toLowerCase() === name.trim().toLowerCase())) {
      newErrors.name = 'A module with this name already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const owner = teamMembers.find(m => m.id === ownerId);

    onAdd({
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      owner,
      color: getSelectedColor(),
    });

    // Reset form
    setName('');
    setType('hardware');
    setDescription('');
    setOwnerId('');
    setCustomColor('');
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setName('');
    setType('hardware');
    setDescription('');
    setOwnerId('');
    setCustomColor('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Module</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Module Name */}
          <div className="space-y-2">
            <Label htmlFor="module-name">
              Module Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="module-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({});
              }}
              placeholder="e.g., Power Management"
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Module Type */}
          <div className="space-y-2">
            <Label>
              Module Type <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as ModuleType)}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getModuleColor(type) }}
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {moduleTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getModuleColor(t) }}
                      />
                      {formatModuleType(t)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {moduleColorPresets.slice(0, 8).map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-all',
                      getSelectedColor() === preset.color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: preset.color }}
                    onClick={() => setCustomColor(preset.color)}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={getSelectedColor()}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-10 h-8 p-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="module-description">Description</Label>
            <Textarea
              id="module-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this module's purpose..."
              rows={3}
            />
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an owner (optional)" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                      <span className="text-muted-foreground text-xs">({member.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Add Module</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
