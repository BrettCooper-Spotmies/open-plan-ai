import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ArrowLeft,
    CalendarIcon,
    FileText,
    Loader2,
    Smile,
    Paperclip,
    Link as LinkIcon,
    Plus,
    X,
    Upload,
    Building2,
    Users,
    Wrench,
    Smartphone,
    Settings,
    Zap,
    Cpu,
    FlaskConical,
    Factory,
    BookOpen,
    Flag,
    Target,
    Pencil,
    Trash2,
    Globe,
    ChevronDown,
    ChevronUp,
    Palette
} from "lucide-react";
import { format, isBefore, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { useUpdateProject, useProject } from "@/hooks/useProjects";
import { useOrganizationMembers } from "@/hooks/useProjectTeam";
import { useProjectAttachments, useCreateAttachment, useDeleteAttachment } from "@/hooks/useProjectAttachments";
import { useProjectLinks, useCreateProjectLink, useDeleteProjectLink } from "@/hooks/useProjectLinks";
import { projectStorageService } from "@/services/projectStorage.service";
import { modulesService } from "@/services/modules.service";
import { milestonesService } from "@/services/milestones.service";
import { projectMembersService } from "@/services/projectMembers.service";
import { chatService } from "@/services/chat.service";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";

const projectTypes = [
    "Hardware Development",
    "Software Development",
    "Firmware Development",
    "Full Product Development",
    "Research & Development",
    "Proof of Concept",
    "Prototype",
    "Production",
];

const projectStagesList = [
    { value: "concept", label: "Concept" },
    { value: "design", label: "Design" },
    { value: "development", label: "Development" },
    { value: "testing", label: "Testing" },
    { value: "production", label: "Production" },
];

const departmentsList = [
    { id: "design", name: "Design", icon: Palette },
    { id: "hardware", name: "Hardware", icon: Wrench },
    { id: "software", name: "Software", icon: Smartphone },
    { id: "mechanical", name: "Mechanical", icon: Settings },
    { id: "electrical", name: "Electrical", icon: Zap },
    { id: "firmware", name: "Firmware", icon: Cpu },
    { id: "testing", name: "Testing & QA", icon: FlaskConical },
    { id: "manufacturing", name: "Manufacturing", icon: Factory },
    { id: "documentation", name: "Documentation", icon: BookOpen },
];

interface ProjectLink {
    id: string;
    name: string;
    url: string;
}

interface TeamMemberAssignment {
    memberId: string;
    role: string;
    name?: string;
    avatar?: string;
}

interface Department {
    id: string;
    name: string;
    icon: React.ElementType;
}

interface ProjectModule {
    id: string;
    name: string;
}

interface ProjectMilestone {
    id: string;
    name: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
}
const projectStages = [
    { value: "concept", label: "Concept" },
    { value: "design", label: "Design" },
    { value: "development", label: "Development" },
    { value: "testing", label: "Testing" },
    { value: "production", label: "Production" },
];

const projectEmojis = [
    "📁", "📂", "🚀", "💡", "⚡", "🎯", "🔧", "⚙️", "🛠️", "💻",
    "📱", "🖥️", "🔌", "🔋", "📡", "🛰️", "🤖", "🧠", "🔬", "🧪",
    "📊", "📈", "📉", "🎨", "🎬", "🎮", "🏗️", "🏭", "🌐", "🔐",
    "✨", "🌟", "⭐", "💎", "🏆", "🎖️", "🥇", "🎁", "📦", "🗃️"
];

const EditProject = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const { currentOrganization } = useOrganization();
    const updateProjectMutation = useUpdateProject();
    const { data: orgMembers = [] } = useOrganizationMembers(currentOrganization?.id);

    // Fetch project data
    const { data: project, isLoading, error } = useProject(id);
    const { data: projectAttachments = [] } = useProjectAttachments(id);
    const { data: projectLinks = [] } = useProjectLinks(id);

    // Mutations
    const createAttachmentMutation = useCreateAttachment();
    const deleteAttachmentMutation = useDeleteAttachment();
    const createLinkMutation = useCreateProjectLink();
    const deleteLinkMutation = useDeleteProjectLink();

    // Form state
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [projectType, setProjectType] = useState("");
    const [projectStage, setProjectStage] = useState("");
    const [projectEmoji, setProjectEmoji] = useState("📁");
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date>();
    const [targetDate, setTargetDate] = useState<Date>();
    const [isSaving, setIsSaving] = useState(false);

    // Optional Details
    const [showOptionalDetails, setShowOptionalDetails] = useState(false);
    const [clientName, setClientName] = useState("");
    const [clientOrganization, setClientOrganization] = useState("");
    const [clientContact, setClientContact] = useState("");
    const [notes, setNotes] = useState("");

    // Team Members
    const [assignedMembers, setAssignedMembers] = useState<TeamMemberAssignment[]>([]);
    const [selectedMember, setSelectedMember] = useState("");

    // Departments
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [customDepartments, setCustomDepartments] = useState<Department[]>([]);
    const [newDeptName, setNewDeptName] = useState("");
    const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);

    // Modules
    const [modules, setModules] = useState<ProjectModule[]>([]);
    const [newModuleName, setNewModuleName] = useState("");
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

    // Milestones
    const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
    const [newMilestoneName, setNewMilestoneName] = useState("");
    const [newMilestoneStart, setNewMilestoneStart] = useState<Date>();
    const [newMilestoneEnd, setNewMilestoneEnd] = useState<Date>();
    const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

    // Links state
    const [newLinkName, setNewLinkName] = useState("");
    const [newLinkUrl, setNewLinkUrl] = useState("");

    // Deletion Confirmation State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: 'module' | 'milestone' | 'attachment' | 'link' | null;
        id: string | null;
    }>({
        isOpen: false,
        type: null,
        id: null
    });
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const [chatRemovalPrompt, setChatRemovalPrompt] = useState<{
        open: boolean;
        memberIds: string[];
    }>({
        open: false,
        memberIds: [],
    });

    const confirmDelete = async () => {
        const { type, id } = deleteConfirmation;
        if (!type || id == null || id === '') return;

        setDeleteInProgress(true);
        try {
        if (type === 'module') {
            const exists = modules.some(m => m.id === id);
            if (!exists) {
                toast.error('Module not found');
                setDeleteConfirmation({ isOpen: false, type: null, id: null });
                return;
            }
            setModules(modules.filter(m => m.id !== id));
            if (editingModuleId === id) {
                setEditingModuleId(null);
                setNewModuleName("");
            }
        } else if (type === 'milestone') {
            const exists = milestones.some(m => m.id === id);
            if (!exists) {
                toast.error('Milestone not found');
                setDeleteConfirmation({ isOpen: false, type: null, id: null });
                return;
            }
            setMilestones(milestones.filter(m => m.id !== id));
            if (editingMilestoneId === id) {
                setEditingMilestoneId(null);
                setNewMilestoneName("");
                setNewMilestoneStart(undefined);
                setNewMilestoneEnd(undefined);
            }
        } else if (type === 'attachment') {
            try {
                await deleteAttachmentMutation.mutateAsync(id);
                // Also remove it from local state to trigger rerender if it was an unsaved local file
                // But typically it relies on the query invalidation.
            } catch (err) {
                toast.error('Failed to delete attachment');
            }
        } else if (type === 'link') {
            const projectId = project?.id; // Assuming `id` from useParams is the projectId
            if (projectId) {
                try {
                    await deleteLinkMutation.mutateAsync({ linkId: id, projectId: projectId });
                } catch (err) {
                    toast.error('Failed to delete link');
                }
            }
        }

        setDeleteConfirmation({ isOpen: false, type: null, id: null });
        } finally {
            setDeleteInProgress(false);
        }
    };

    // File upload state
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canManageProjectMembers = useMemo(() => {
        if (!project || !user?.id) return false;
        if (project.createdBy === user.id) return true;
        const myMembership = (project.team || []).find((member) => member.id === user.id);
        return (myMembership?.role || '').toLowerCase() === 'admin';
    }, [project?.createdBy, project?.team, user?.id]);

    const selectedOrgMember = useMemo(
        () => orgMembers.find((member: any) => member.id === selectedMember),
        [orgMembers, selectedMember]
    );

    const handleAddModule = () => {
        if (newModuleName.trim()) {
            if (editingModuleId) {
                setModules(modules.map(m => m.id === editingModuleId ? { ...m, name: newModuleName.trim() } : m));
                setEditingModuleId(null);
            } else {
                setModules([...modules, { id: Math.random().toString(36).substr(2, 9), name: newModuleName.trim() }]);
            }
            setNewModuleName("");
        }
    };

    const handleEditModule = (module: ProjectModule) => {
        setNewModuleName(module.name);
        setEditingModuleId(module.id);
    };

    const handleRemoveModule = (id: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'module', id });
    };

    const handleAddMilestone = () => {
        if (newMilestoneName.trim() && newMilestoneStart && newMilestoneEnd) {
            if (editingMilestoneId) {
                setMilestones(milestones.map(m => m.id === editingMilestoneId ? {
                    ...m,
                    name: newMilestoneName.trim(),
                    startDate: newMilestoneStart,
                    endDate: newMilestoneEnd
                } : m));
                setEditingMilestoneId(null);
            } else {
                setMilestones([
                    ...milestones,
                    {
                        id: Math.random().toString(36).substr(2, 9),
                        name: newMilestoneName.trim(),
                        startDate: newMilestoneStart,
                        endDate: newMilestoneEnd
                    }
                ]);
            }
            setNewMilestoneName("");
            setNewMilestoneStart(undefined);
            setNewMilestoneEnd(undefined);
        }
    };

    const handleEditMilestone = (milestone: ProjectMilestone) => {
        setNewMilestoneName(milestone.name);
        setNewMilestoneStart(milestone.startDate);
        setNewMilestoneEnd(milestone.endDate);
        setEditingMilestoneId(milestone.id);
    };

    const handleRemoveMilestone = (id: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'milestone', id });
    };

    const handleAddTeamMember = () => {
        if (!canManageProjectMembers) {
            toast.error('Only the project creator or an Admin can add or remove members');
            return;
        }

        if (selectedMember) {
            const exists = assignedMembers.find(m => m.memberId === selectedMember);
            if (!exists) {
                const memberObj = orgMembers.find(m => m.id === selectedMember);
                const inheritedRole = memberObj?.role || "member";
                setAssignedMembers([...assignedMembers, {
                    memberId: selectedMember,
                    role: inheritedRole,
                    name: memberObj?.name,
                    avatar: memberObj?.avatar
                }]);
                setSelectedMember("");
            } else {
                toast.error("Member already assigned");
            }
        }
    };

    const handleRemoveTeamMember = (memberId: string) => {
        if (!canManageProjectMembers) {
            toast.error('Only the project creator or an Admin can add or remove members');
            return;
        }

        setAssignedMembers(assignedMembers.filter(m => m.memberId !== memberId));
    };

    const handleDepartmentToggle = (departmentId: string) => {
        setSelectedDepartments(prev =>
            prev.includes(departmentId)
                ? prev.filter(d => d !== departmentId)
                : [...prev, departmentId]
        );
    };

    const handleAddCustomDepartment = () => {
        if (newDeptName.trim()) {
            const newId = `custom-${Date.now()}`;
            const newDept: Department = {
                id: newId,
                name: newDeptName.trim(),
                icon: Building2 // Use generic icon for custom departments
            };

            setCustomDepartments([...customDepartments, newDept]);
            setSelectedDepartments([...selectedDepartments, newId]); // Auto-select new department
            setNewDeptName("");
            setIsAddDeptOpen(false);
        }
    };

    // Initialize form with project data
    useEffect(() => {
        if (project) {
            setProjectName(project.name || "");
            setProjectDescription(project.description || "");
            setProjectType(project.type || "");
            setProjectStage(project.stage || "concept");
            setProjectEmoji(project.icon || "📁");
            if (project.startDate) {
                setStartDate(new Date(project.startDate));
            }
            if (project.targetDate) {
                setTargetDate(new Date(project.targetDate));
            }

            // Populating optional details
            setClientName(project.clientName || "");
            setClientOrganization(project.clientOrganization || "");
            setClientContact(project.clientContact || "");
            setNotes(project.notes || "");

            // Populating departments
            if (project.departments) {
                setSelectedDepartments(project.departments);
                // Identifying custom departments
                const customDepts = project.departments.filter(dId => !departmentsList.find(d => d.id === dId));
                if (customDepts.length > 0) {
                    setCustomDepartments(customDepts.map(dId => ({
                        id: dId,
                        name: dId.startsWith('custom-') ? dId.split('-')[1] : dId, // Fallback naming
                        icon: Building2
                    })));
                }
            }

            // Populating team members
            if (project.team) {
                setAssignedMembers(project.team.map(m => ({
                    memberId: m.id,
                    role: m.role,
                    name: m.name,
                    avatar: m.avatar
                })));
            }

            // Populating modules
            if (project.projectModules) {
                // First-class modules initialization
                const projectModules = project.projectModules || [];
                setModules(projectModules.map(m => ({
                    id: m.id,
                    name: m.name,
                    type: m.type
                })));
            } else if (project.modules) {
                // Fallback for legacy modules
                setModules(project.modules.map(m => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: m.name
                })));
            }

            // Populating milestones
            if (project.milestones) {
                setMilestones(project.milestones.map(m => ({
                    id: m.id,
                    name: m.title,
                    startDate: undefined, // Milestone model doesn't have startDate yet? 
                    endDate: m.date ? new Date(m.date) : undefined
                })));
            }
        }
    }, [project]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFileUpload = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0 || !id) return;

        setIsUploading(true);
        const errors: string[] = [];

        try {
            for (const file of Array.from(files)) {
                if (file.size > 50 * 1024 * 1024) {
                    errors.push(`${file.name}: File too large (max 50MB)`);
                    continue;
                }

                try {
                    const uploadResult = await projectStorageService.uploadFile(file, id);
                    await createAttachmentMutation.mutateAsync({
                        entity_id: id,
                        entity_type: 'project',
                        file_name: uploadResult.name,
                        file_path: uploadResult.path,
                        file_size: file.size,
                        mime_type: file.type,
                        project_id: id,
                    });
                } catch (err) {
                    errors.push(`${file.name}: Upload failed`);
                }
            }

            if (errors.length > 0) {
                toast.error('Some files failed to upload', { description: errors.join('\n') });
            } else {
                toast.success('Files uploaded successfully');
            }
        } finally {
            setIsUploading(false);
        }
    }, [id, createAttachmentMutation]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    }, [handleFileUpload]);

    const handleAddLink = async () => {
        if (!newLinkName || !newLinkUrl || !id) return;

        try {
            await createLinkMutation.mutateAsync({
                project_id: id,
                name: newLinkName,
                url: newLinkUrl,
            });
            setNewLinkName("");
            setNewLinkUrl("");
            toast.success('Link added successfully');
        } catch (err) {
            toast.error('Failed to add link');
        }
    };

    const handleDeleteAttachment = (attachmentId: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'attachment', id: attachmentId });
    };

    const handleDeleteLink = (linkId: string) => {
        setDeleteConfirmation({ isOpen: true, type: 'link', id: linkId });
    };

    const executeSave = async (removeFromChatToo: boolean) => {
        if (!id || !project) return;

        setIsSaving(true);
        try {
            await updateProjectMutation.mutateAsync({
                id,
                updates: {
                    name: projectName,
                    description: projectDescription,
                    type: projectType,
                    stage: projectStage as any,
                    icon: projectEmoji,
                    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                    targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : undefined,
                    clientName: clientName || undefined,
                    clientOrganization: clientOrganization || undefined,
                    clientContact: clientContact || undefined,
                    notes: notes || undefined,
                    departments: selectedDepartments,
                },
            });

            // Sync team members (authorization must be enforced server-side)
            const isValidUuidLike = (value: unknown): value is string => {
                if (typeof value !== 'string') return false;
                return (
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
                    /^[0-9a-f]{32}$/i.test(value)
                );
            };

            // Guard against invalid/empty IDs reaching the backend mutation calls.
            if (!isValidUuidLike(project.id)) {
                toast.error('Invalid project id');
                return;
            }

            const currentInDbIds = (project.team?.map((m: any) => m.id) ?? []).filter(isValidUuidLike);
            const assignedIds = assignedMembers.map((m) => m.memberId).filter(isValidUuidLike);

            // Members to add
            const newMembers = assignedMembers.filter(
                (m) => isValidUuidLike(m.memberId) && !currentInDbIds.includes(m.memberId)
            );
            // Members to remove
            const removedMemberIds = currentInDbIds.filter((memberId) => !assignedIds.includes(memberId));

            if (newMembers.length > 0) {
                try {
                    const memberData = newMembers.map(m => ({
                        userId: m.memberId,
                        role: m.role,
                    }));
                    await projectMembersService.addMembers(project.id, memberData);
                } catch (memberError) {
                    console.error('[executeSave] Error adding team members', {
                        projectId: id,
                        userIds: newMembers.map(m => m.memberId),
                        error: memberError,
                    });
                    const message = memberError instanceof Error ? memberError.message : 'Failed to add project members';
                    toast.warning(`Project updated, but failed to add ${newMembers.length} member(s)`, { description: message });
                }
            }

            if (removedMemberIds.length > 0) {
                try {
                    if (!removeFromChatToo) {
                        await chatService.retainProjectChatMembershipAfterRemoval(project.id, removedMemberIds);
                    }

                    await projectMembersService.removeMembers(project.id, removedMemberIds);

                    if (removeFromChatToo) {
                        try {
                            await chatService.forceRemoveProjectChatMembers(project.id, removedMemberIds);
                        } catch (chatError) {
                            console.error('[executeSave] Chat member removal failed', {
                                projectId: id,
                                userIds: removedMemberIds,
                                error: chatError,
                            });
                            const message = chatError instanceof Error ? chatError.message : 'Failed to remove members from project chat';
                            toast.warning(
                                `Removed ${removedMemberIds.length} member(s) from project, but could not update project chat`,
                                { description: message }
                            );
                        }
                    }
                } catch (memberError) {
                    console.error('[executeSave] Error removing team members', {
                        projectId: id,
                        userIds: removedMemberIds,
                        error: memberError,
                    });
                    const message = memberError instanceof Error ? memberError.message : 'Failed to remove project members';
                    toast.warning(`Project updated, but failed to remove ${removedMemberIds.length} member(s)`, { description: message });
                }
            }

            // Sync Modules
            try {
                const initialModules = project.projectModules || [];
                const initialModuleIds = initialModules.map(m => m.id);
                const currentModuleIds = modules.map(m => m.id);

                // Modules to add
                const modulesToAdd = modules.filter(m => !initialModuleIds.includes(m.id));
                // Modules to remove
                const moduleIdsToRemove = initialModuleIds.filter(id => !currentModuleIds.includes(id));
                // Modules to update
                const modulesToUpdate = modules.filter(m => {
                    const initial = initialModules.find(im => im.id === m.id);
                    return initial && initial.name !== m.name;
                });

                if (modulesToAdd.length > 0) {
                    await modulesService.createMany(modulesToAdd.map(m => ({
                        project_id: id,
                        name: m.name,
                        module_type: 'software' as any,
                    })));
                }

                if (modulesToUpdate.length > 0) {
                    if (modulesService.updateMany) {
                        await modulesService.updateMany(modulesToUpdate.map(m => ({ id: m.id, name: m.name })));
                    } else {
                        await Promise.all(modulesToUpdate.map(m =>
                            modulesService.update(m.id, { name: m.name })
                        ));
                    }
                }

                if (moduleIdsToRemove.length > 0) {
                    await modulesService.deleteMany(moduleIdsToRemove);
                }
            } catch (moduleError) {
                console.error('Error syncing modules:', moduleError);
                toast.warning('Project updated but module changes failed to sync');
            }

            // Sync Milestones
            try {
                const initialMilestones = project.milestones || [];
                const initialMilestoneIds = initialMilestones.map(m => m.id);
                const currentMilestoneIds = milestones.map(m => m.id);

                // Milestones to add
                const milestonesToAdd = milestones.filter(m => !initialMilestoneIds.includes(m.id));
                // Milestones to remove
                const milestoneIdsToRemove = initialMilestoneIds.filter(id => !currentMilestoneIds.includes(id));
                // Milestones to update
                const milestonesToUpdate = milestones.filter(m => {
                    const initial = initialMilestones.find(im => im.id === m.id);
                    if (!initial) return false;
                    const initialDate = initial.date ? format(new Date(initial.date), 'yyyy-MM-dd') : null;
                    const currentDate = m.endDate ? format(m.endDate, 'yyyy-MM-dd') : null;
                    return initial.title !== m.name || initialDate !== currentDate;
                });

                if (milestonesToAdd.length > 0) {
                    await milestonesService.createMany(milestonesToAdd.map(m => ({
                        project_id: id,
                        name: m.name,
                        due_date: m.endDate ? format(m.endDate, 'yyyy-MM-dd') : null,
                    })));
                }

                if (milestonesToUpdate.length > 0) {
                    await milestonesService.updateMany(milestonesToUpdate.map(m => ({
                        id: m.id,
                        name: m.name,
                        due_date: m.endDate ? format(m.endDate, 'yyyy-MM-dd') : null,
                    })));
                }

                if (milestoneIdsToRemove.length > 0) {
                    await milestonesService.deleteMany(milestoneIdsToRemove);
                }
            } catch (milestoneError) {
                console.error('Error syncing milestones:', milestoneError);
                toast.warning('Project updated but milestone changes failed to sync');
            }

            // Invalidate queries to ensure project detail page reflects all changes
            await queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.modules.list(id) });
            await queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(id) });

            toast.success('Project updated successfully!');
            navigate(`/projects/${id}`);
        } catch (error) {
            console.error('Error updating project:', error);
            toast.error('Failed to update project');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!id || !project) return;

        if (!projectName.trim()) {
            toast.error('Project name is required');
            return;
        }

        if (!startDate) {
            toast.error('Start date is required');
            return;
        }

        if (!targetDate) {
            toast.error('Target date is required');
            return;
        }

        const currentInDbIds = project.team?.map((m: any) => m.id) || [];
        const assignedIds = assignedMembers.map(m => m.memberId);
        const removedMemberIds = currentInDbIds.filter(memberId => !assignedIds.includes(memberId));

        if (canManageProjectMembers && removedMemberIds.length > 0) {
            setChatRemovalPrompt({
                open: true,
                memberIds: removedMemberIds,
            });
            return;
        }

        await executeSave(false);
    };

    if (isLoading) {
        return (
            <>
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    if (error || !project) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <h2 className="text-xl font-medium">Project not found</h2>
                    <p className="text-muted-foreground mt-2">
                        The project you are trying to edit does not exist.
                    </p>
                    <Button className="mt-4" onClick={() => navigate('/projects')}>
                        Back to Projects
                    </Button>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/projects/${id}`)}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl font-semibold text-foreground truncate">Edit Project</h1>
                            <p className="text-muted-foreground text-sm truncate">{project.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" onClick={() => navigate(`/projects/${id}`)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Basic Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Basic Details
                        </CardTitle>
                        <CardDescription>Update the project information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="projectName">Project Name <span className="text-destructive">*</span></Label>
                                <div className="flex gap-2">
                                    <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 shrink-0 text-xl"
                                                title="Select project icon"
                                            >
                                                {projectEmoji}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-72 p-3" align="start">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Smile className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Select Project Icon</span>
                                                </div>
                                                <div className="grid grid-cols-8 gap-1">
                                                    {projectEmojis.map((emoji) => (
                                                        <Button
                                                            key={emoji}
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-8 w-8 text-lg hover:bg-primary/10",
                                                                projectEmoji === emoji && "bg-primary/20 ring-1 ring-primary"
                                                            )}
                                                            onClick={() => {
                                                                setProjectEmoji(emoji);
                                                                setIsEmojiPickerOpen(false);
                                                            }}
                                                        >
                                                            {emoji}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <Input
                                        id="projectName"
                                        placeholder="Enter project name"
                                        value={projectName}
                                        maxLength={100}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="projectType">Project Type <span className="text-destructive">*</span></Label>
                                <Select value={projectType} onValueChange={setProjectType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="projectStage">Project Stage <span className="text-destructive">*</span></Label>
                                <Select value={projectStage} onValueChange={setProjectStage}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectStages.map((stage) => (
                                            <SelectItem key={stage.value} value={stage.value}>
                                                {stage.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="projectDescription">Project Description <span className="text-destructive">*</span></Label>
                            <div className="space-y-1">
                                <Textarea
                                    id="projectDescription"
                                    placeholder="Describe your project..."
                                    value={projectDescription}
                                    maxLength={1000}
                                    onChange={(e) => setProjectDescription(e.target.value)}
                                    rows={4}
                                />
                                <div className="flex justify-end">
                                    <span className={cn(
                                        "text-[10px] tabular-nums",
                                        projectDescription.length >= 1000 ? "text-destructive font-medium" : "text-muted-foreground"
                                    )}>
                                        {projectDescription.length}/1000
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Start Date <span className="text-destructive">*</span></Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : "Select start date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            disabled={{ before: startOfToday() }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Date <span className="text-destructive">*</span></Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !targetDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {targetDate ? format(targetDate, "PPP") : "Select target date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={targetDate}
                                            onSelect={setTargetDate}
                                            disabled={(date) => isBefore(date, startOfToday()) || (startDate ? isBefore(date, startDate) : false)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Optional Details Toggle */}
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                    >
                        {showOptionalDetails ? (
                            <>
                                <ChevronUp className="h-4 w-4 mr-2" />
                                Hide Optional Details
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                Show Optional Details (Client, Notes)
                            </>
                        )}
                    </Button>
                </div>

                {/* Optional Details */}
                {showOptionalDetails && (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Optional Details
                            </CardTitle>
                            <CardDescription>Client information and project notes</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="clientName">Client Name</Label>
                                    <Input
                                        id="clientName"
                                        placeholder="e.g. John Doe"
                                        value={clientName}
                                        maxLength={100}
                                        onChange={(e) => setClientName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clientOrg">Client Organization</Label>
                                    <Input
                                        id="clientOrg"
                                        placeholder="e.g. Acme Corp"
                                        value={clientOrganization}
                                        maxLength={100}
                                        onChange={(e) => setClientOrganization(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clientContact">Contact Number (10 digits)</Label>
                                <Input
                                    id="clientContact"
                                    placeholder="e.g. 1234567890"
                                    value={clientContact}
                                    maxLength={10}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setClientContact(val);
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Internal Project Notes</Label>
                                <div className="space-y-1">
                                    <Textarea
                                        id="notes"
                                        placeholder="Any additional information..."
                                        value={notes}
                                        maxLength={2000}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                    />
                                    <div className="flex justify-end">
                                        <span className={cn(
                                            "text-[10px] tabular-nums",
                                            notes.length >= 2000 ? "text-destructive font-medium" : "text-muted-foreground"
                                        )}>
                                            {notes.length}/2000
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Departments Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Project Departments
                        </CardTitle>
                        <CardDescription>Select which departments are involved in this project</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {departmentsList.map((dept) => {
                                const Icon = dept.icon;
                                const isSelected = selectedDepartments.includes(dept.id);
                                return (
                                    <Button
                                        key={dept.id}
                                        variant={isSelected ? "default" : "outline"}
                                        className={cn(
                                            "h-auto py-3 px-4 flex flex-col items-center gap-2 transition-all",
                                            isSelected ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                                        )}
                                        onClick={() => handleDepartmentToggle(dept.id)}
                                    >
                                        <Icon className={cn("h-6 w-6", isSelected ? "text-primary-foreground" : "text-primary")} />
                                        <span className="text-xs font-medium">{dept.name}</span>
                                    </Button>
                                );
                            })}

                            {/* Custom Departments */}
                            {customDepartments.map((dept) => {
                                const Icon = dept.icon;
                                const isSelected = selectedDepartments.includes(dept.id);
                                return (
                                    <Button
                                        key={dept.id}
                                        variant={isSelected ? "default" : "outline"}
                                        className={cn(
                                            "h-auto py-3 px-4 flex flex-col items-center gap-2 transition-all group",
                                            isSelected ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                                        )}
                                        onClick={() => handleDepartmentToggle(dept.id)}
                                    >
                                        <Icon className={cn("h-6 w-6", isSelected ? "text-primary-foreground" : "text-primary")} />
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-medium truncate max-w-[80px]">{dept.name}</span>
                                            <X
                                                className="h-3 w-3 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCustomDepartments(customDepartments.filter(d => d.id !== dept.id));
                                                    setSelectedDepartments(selectedDepartments.filter(d => d !== dept.id));
                                                }}
                                            />
                                        </div>
                                    </Button>
                                );
                            })}

                            {/* Add Custom Department Button */}
                            <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-dashed hover:border-primary hover:bg-primary/5"
                                    >
                                        <Plus className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-xs font-medium">Add Other</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Custom Department</DialogTitle>
                                        <DialogDescription>
                                            Enter the name of the department you want to add to this project.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label htmlFor="newDeptName">Department Name</Label>
                                        <Input
                                            id="newDeptName"
                                            placeholder="e.g. Finance, Marketing..."
                                            value={newDeptName}
                                            onChange={(e) => setNewDeptName(e.target.value)}
                                            className="mt-2"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomDepartment()}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsAddDeptOpen(false)}>Cancel</Button>
                                        <Button onClick={handleAddCustomDepartment}>Add Department</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                {/* Team Members Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Project Team
                        </CardTitle>
                        <CardDescription>
                            {canManageProjectMembers
                                ? 'Assign team members to this project (organization role is inherited automatically)'
                                : 'Only the project creator or an Admin can manage team members'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 space-y-2">
                                <Label>Member</Label>
                                <Select value={selectedMember} onValueChange={setSelectedMember} disabled={!canManageProjectMembers}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orgMembers.map((member: any) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={member.avatar} />
                                                        <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    {member.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                className="md:mt-8"
                                onClick={handleAddTeamMember}
                                disabled={!canManageProjectMembers || !selectedMember}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>
                        {selectedOrgMember && (
                            <p className="text-[11px] text-muted-foreground">
                                Role will be inherited automatically from organization:{" "}
                                <span className="font-medium text-foreground capitalize">
                                    {selectedOrgMember.role || 'member'}
                                </span>
                            </p>
                        )}

                        {assignedMembers.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                <Label>Assigned Members</Label>
                                <div className="grid gap-3">
                                    {assignedMembers.map((assignment) => {
                                        const member = orgMembers.find((m: any) => m.id === assignment.memberId);
                                        const displayName = member?.name || assignment.name || "Unknown Member";
                                        const displayAvatar = member?.avatar || assignment.avatar;
                                        return (
                                            <div key={assignment.memberId} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={displayAvatar} />
                                                        <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">{displayName}</p>
                                                        {assignment.role && (
                                                            <Badge variant="secondary" className="text-[10px] h-4">
                                                                {assignment.role}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {canManageProjectMembers && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveTeamMember(assignment.memberId)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modules Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" />
                            Project Modules
                        </CardTitle>
                        <CardDescription>Break down the project into logical modules</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Module name (e.g. PCB Design, UI Components)"
                                value={newModuleName}
                                onChange={(e) => setNewModuleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
                            />
                            {editingModuleId && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setEditingModuleId(null);
                                        setNewModuleName("");
                                    }}
                                >
                                    <X className="h-4 w-4 mr-0" />
                                </Button>
                            )}
                            <Button onClick={handleAddModule} disabled={!newModuleName.trim()}>
                                {editingModuleId ? <Settings className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                {editingModuleId ? "Update" : "Add"}
                            </Button>
                        </div>

                        {modules.length > 0 && (
                            <div className="grid gap-2 pt-2">
                                {modules.map((module) => (
                                    <div key={module.id} className="flex items-center justify-between p-3 rounded-md border group">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0">
                                                {modules.indexOf(module) + 1}
                                            </Badge>
                                            <span className="text-sm font-medium">{module.name}</span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditModule(module)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveModule(module.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Milestones Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flag className="h-5 w-5 text-primary" />
                            Project Milestones
                        </CardTitle>
                        <CardDescription>Key targets and schedule for this project</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <Input
                                placeholder="Milestone name (e.g. Design Freeze, Prototype V1)"
                                value={newMilestoneName}
                                onChange={(e) => setNewMilestoneName(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs", !newMilestoneStart && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {newMilestoneStart ? format(newMilestoneStart, "PP") : "Start"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newMilestoneStart} onSelect={setNewMilestoneStart} disabled={{ before: startOfToday() }} /></PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs", !newMilestoneEnd && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {newMilestoneEnd ? format(newMilestoneEnd, "PP") : "End"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newMilestoneEnd} onSelect={setNewMilestoneEnd} disabled={(date) => isBefore(date, startOfToday()) || (newMilestoneStart ? isBefore(date, newMilestoneStart) : false)} /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex gap-2">
                                {editingMilestoneId && (
                                    <Button 
                                        variant="outline" 
                                        className="w-1/3"
                                        onClick={() => {
                                            setEditingMilestoneId(null);
                                            setNewMilestoneName("");
                                            setNewMilestoneStart(undefined);
                                            setNewMilestoneEnd(undefined);
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                    </Button>
                                )}
                                <Button className="flex-1" variant="secondary" onClick={handleAddMilestone} disabled={!newMilestoneName.trim() || !newMilestoneStart || !newMilestoneEnd}>
                                    {editingMilestoneId ? "Update Milestone" : "Add Milestone"}
                                </Button>
                            </div>
                        </div>

                        {milestones.length > 0 && (
                            <div className="grid gap-3 pt-2">
                                {milestones.map((ms) => (
                                    <div key={ms.id} className="flex items-center justify-between p-3 rounded-md border-l-4 border-l-primary bg-muted/30">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold">{ms.name}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                <div className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {ms.startDate ? format(ms.startDate, "PP") : ""}</div>
                                                <div className="flex items-center gap-1"><Target className="h-3 w-3" /> {ms.endDate ? format(ms.endDate, "PP") : ""}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditMilestone(ms)}><Pencil className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveMilestone(ms.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Attachments */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5 text-primary" />
                            Attachments
                        </CardTitle>
                        <CardDescription>Manage project files and documents</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* File Upload Zone */}
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                                isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                                isUploading && "opacity-50 pointer-events-none"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileUpload(e.target.files)}
                            />
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">
                                Drag and drop files here, or{" "}
                                <button
                                    type="button"
                                    className="text-primary hover:underline"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    browse
                                </button>
                            </p>
                            <p className="text-xs text-muted-foreground">Max file size: 50MB</p>
                        </div>

                        {/* Existing Attachments */}
                        {projectAttachments.length > 0 && (
                            <div className="space-y-2">
                                <Label>Current Attachments</Label>
                                <div className="space-y-2">
                                    {projectAttachments.map((attachment: any) => (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                {attachment.url ? (
                                                    <a
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm truncate hover:underline text-foreground"
                                                        title="Click to view file"
                                                    >
                                                        {attachment.file_name || attachment.name}
                                                    </a>
                                                ) : (
                                                    <span className="text-sm truncate">{attachment.file_name || attachment.name}</span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    ({formatFileSize(attachment.file_size || 0)})
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0"
                                                onClick={() => handleDeleteAttachment(attachment.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Links */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-primary" />
                            Project Links
                        </CardTitle>
                        <CardDescription>Add external links related to this project</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Add New Link */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Link name"
                                value={newLinkName}
                                onChange={(e) => setNewLinkName(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                placeholder="URL"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleAddLink} disabled={!newLinkName || !newLinkUrl}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Existing Links */}
                        {projectLinks.length > 0 && (
                            <div className="space-y-2">
                                {projectLinks.map((link: any) => (
                                    <div
                                        key={link.id}
                                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-sm font-medium">{link.name || link.title}</span>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline truncate max-w-[200px]"
                                            >
                                                {link.url}
                                            </a>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => handleDeleteLink(link.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => {
                    if (!open) setDeleteConfirmation({ isOpen: false, type: null, id: null });
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Deletion</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this {deleteConfirmation.type}? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteConfirmation({ isOpen: false, type: null, id: null })} disabled={deleteInProgress}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete} disabled={deleteInProgress}>
                                {deleteInProgress ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Project member removal chat prompt */}
                <Dialog
                    open={chatRemovalPrompt.open}
                    onOpenChange={(open) => {
                        if (!open && !isSaving) {
                            setChatRemovalPrompt({ open: false, memberIds: [] });
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Remove from group chat too?</DialogTitle>
                            <DialogDescription>
                                {chatRemovalPrompt.memberIds.length === 1
                                    ? 'This member will be removed from the project. Should they also be removed from the project group chat, or kept in that chat?'
                                    : 'These members will be removed from the project. Should they also be removed from the project group chat, or kept in that chat?'}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setChatRemovalPrompt({ open: false, memberIds: [] })}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={async () => {
                                    setChatRemovalPrompt({ open: false, memberIds: [] });
                                    await executeSave(false);
                                }}
                                disabled={isSaving}
                            >
                                No, keep in chat
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    setChatRemovalPrompt({ open: false, memberIds: [] });
                                    await executeSave(true);
                                }}
                                disabled={isSaving}
                            >
                                Yes, remove from chat
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
};

export default EditProject;
