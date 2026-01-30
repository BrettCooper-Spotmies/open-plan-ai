import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { useUpdateProject } from "@/hooks/useProjects";
import { useProjectAttachments, useCreateAttachment, useDeleteAttachment } from "@/hooks/useProjectAttachments";
import { useProjectLinks, useCreateProjectLink, useDeleteProjectLink } from "@/hooks/useProjectLinks";
import { projectStorageService } from "@/services/projectStorage.service";

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

interface ProjectLink {
    id: string;
    name: string;
    url: string;
}

const EditProject = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const updateProjectMutation = useUpdateProject();

    // Fetch project data
    const { data: project, isLoading, error } = useProjectDetail(id);
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
    const [projectStage, setProjectStage] = useState("");
    const [projectEmoji, setProjectEmoji] = useState("📁");
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date>();
    const [targetDate, setTargetDate] = useState<Date>();
    const [isSaving, setIsSaving] = useState(false);

    // Links state
    const [newLinkName, setNewLinkName] = useState("");
    const [newLinkUrl, setNewLinkUrl] = useState("");

    // File upload state
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize form with project data
    useEffect(() => {
        if (project) {
            setProjectName(project.name || "");
            setProjectDescription(project.description || "");
            setProjectStage(project.stage || "concept");
            setProjectEmoji(project.icon || "📁");
            if (project.startDate) {
                setStartDate(new Date(project.startDate));
            }
            if (project.targetDate) {
                setTargetDate(new Date(project.targetDate));
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

    const handleDeleteAttachment = async (attachmentId: string) => {
        try {
            await deleteAttachmentMutation.mutateAsync(attachmentId);
        } catch (err) {
            toast.error('Failed to delete attachment');
        }
    };

    const handleDeleteLink = async (linkId: string) => {
        if (!id) return;
        try {
            await deleteLinkMutation.mutateAsync({ linkId, projectId: id });
        } catch (err) {
            toast.error('Failed to delete link');
        }
    };

    const handleSave = async () => {
        if (!id) return;

        if (!projectName.trim()) {
            toast.error('Project name is required');
            return;
        }

        setIsSaving(true);

        try {
            await updateProjectMutation.mutateAsync({
                id,
                updates: {
                    name: projectName,
                    description: projectDescription,
                    stage: projectStage as any,
                    icon: projectEmoji,
                    startDate: startDate?.toISOString().split('T')[0],
                    targetDate: targetDate?.toISOString().split('T')[0],
                },
            });

            toast.success('Project updated successfully!');
            navigate(`/projects/${id}`);
        } catch (error) {
            console.error('Error updating project:', error);
            toast.error('Failed to update project');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <AppLayout>
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
            </AppLayout>
        );
    }

    if (error || !project) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <h2 className="text-xl font-medium">Project not found</h2>
                    <p className="text-muted-foreground mt-2">
                        The project you are trying to edit does not exist.
                    </p>
                    <Button className="mt-4" onClick={() => navigate('/projects')}>
                        Back to Projects
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/projects/${id}`)}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">Edit Project</h1>
                            <p className="text-muted-foreground text-sm">{project.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
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
                                <Label htmlFor="projectName">Project Name *</Label>
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
                                        onChange={(e) => setProjectName(e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="projectStage">Project Stage</Label>
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
                            <Label htmlFor="projectDescription">Description</Label>
                            <Textarea
                                id="projectDescription"
                                placeholder="Describe your project..."
                                value={projectDescription}
                                onChange={(e) => setProjectDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
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
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Date</Label>
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
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
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
            </div>
        </AppLayout>
    );
};

export default EditProject;
