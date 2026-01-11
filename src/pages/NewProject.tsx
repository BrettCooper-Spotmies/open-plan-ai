import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CalendarIcon,
  Plus,
  X,
  Upload,
  FileText,
  Users,
  Building2,
  Paperclip,
  ListTodo,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileSpreadsheet,
  Palette,
  Laptop,
  Wrench,
  Smartphone,
  Settings,
  Zap,
  Cpu,
  FlaskConical,
  Factory,
  BookOpen,
  Link as LinkIcon,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { teamMembers } from "@/data/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const departments = [
  { id: "design", name: "Design", icon: Palette },
  // { id: "development", name: "Development", icon: Laptop },
  { id: "hardware", name: "Hardware", icon: Wrench },
  { id: "software", name: "Software", icon: Smartphone },
  { id: "mechanical", name: "Mechanical", icon: Settings },
  { id: "electrical", name: "Electrical", icon: Zap },
  { id: "firmware", name: "Firmware", icon: Cpu },
  { id: "testing", name: "Testing & QA", icon: FlaskConical },
  { id: "manufacturing", name: "Manufacturing", icon: Factory },
  { id: "documentation", name: "Documentation", icon: BookOpen },
];

const roles = [
  "Admin",
  "Member",
  "Project Lead",
  "Developer",
  "Designer",
  "Hardware Engineer",
  "Software Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "QA Engineer",
  "Technical Writer",
  "Consultant",
];

interface TeamMemberAssignment {
  memberId: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
  icon: React.ElementType;
}

interface ProjectLink {
  id: string;
  name: string;
  url: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
}

interface ExtractedTask {
  id: string;
  title: string;
  description: string;
  priority: string;
}

const NewProject = () => {
  const navigate = useNavigate();

  // Basic Details
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [expectedEndDate, setExpectedEndDate] = useState<Date>();

  // Optional Details
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientOrganization, setClientOrganization] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [notes, setNotes] = useState("");

  // Team Members
  const [assignedMembers, setAssignedMembers] = useState<TeamMemberAssignment[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Departments
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [customDepartments, setCustomDepartments] = useState<Department[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);

  // Storage (Attachments & Links)
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([
    { id: "1", name: "Project_Requirements.pdf", size: "2.4 MB", type: "pdf" },
    { id: "2", name: "Technical_Specs.docx", size: "1.1 MB", type: "docx" },
  ]);

  // Tasks from document
  const [taskDocument, setTaskDocument] = useState<UploadedFile | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddTeamMember = () => {
    if (selectedMember && selectedRole) {
      const exists = assignedMembers.find(m => m.memberId === selectedMember);
      if (!exists) {
        setAssignedMembers([...assignedMembers, { memberId: selectedMember, role: selectedRole }]);
        setSelectedMember("");
        setSelectedRole("");
      }
    }
  };

  const handleRemoveTeamMember = (memberId: string) => {
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

  const handleRemoveAttachment = (fileId: string) => {
    setAttachments(attachments.filter(f => f.id !== fileId));
  };

  const handleAddLink = () => {
    if (newLinkName && newLinkUrl) {
      setLinks([...links, { id: Math.random().toString(36).substr(2, 9), name: newLinkName, url: newLinkUrl }]);
      setNewLinkName("");
      setNewLinkUrl("");
    }
  };

  const handleRemoveLink = (linkId: string) => {
    setLinks(links.filter(l => l.id !== linkId));
  };

  const handleTaskDocumentUpload = () => {
    // Simulate document upload and task extraction
    setTaskDocument({ id: "task-doc", name: "Project_Tasks.xlsx", size: "856 KB", type: "xlsx" });
    setIsProcessing(true);

    // Simulate AI processing delay
    setTimeout(() => {
      setExtractedTasks([
        { id: "t1", title: "Initial hardware design review", description: "Review and approve initial schematic designs", priority: "high" },
        { id: "t2", title: "PCB layout completion", description: "Complete PCB layout for main control board", priority: "high" },
        { id: "t3", title: "Firmware architecture planning", description: "Define firmware modules and interfaces", priority: "medium" },
        { id: "t4", title: "Component sourcing", description: "Source and order critical components", priority: "critical" },
        { id: "t5", title: "Prototype assembly", description: "Assemble first prototype units", priority: "medium" },
        { id: "t6", title: "Integration testing", description: "Test hardware-firmware integration", priority: "high" },
      ]);
      setIsProcessing(false);
    }, 2000);
  };

  const handleRemoveTask = (taskId: string) => {
    setExtractedTasks(extractedTasks.filter(t => t.id !== taskId));
  };

  const handleCreateProject = () => {
    // In a real app, this would save to database
    console.log("Creating project:", {
      projectName,
      projectDescription,
      projectType,
      startDate,
      expectedEndDate,
      clientName,
      clientOrganization,
      clientContact,
      notes,
      assignedMembers,
      selectedDepartments,
      attachments,
      links,
      extractedTasks,
    });
    navigate("/projects");
  };

  const getMemberById = (id: string) => teamMembers.find(m => m.id === id);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-priority-critical/10 text-priority-critical border-priority-critical/20";
      case "high": return "bg-priority-high/10 text-priority-high border-priority-high/20";
      case "medium": return "bg-priority-medium/10 text-priority-medium border-priority-medium/20";
      default: return "bg-priority-low/10 text-priority-low border-priority-low/20";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/projects")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Create New Project</h1>
            {/* <p className="text-muted-foreground">Fill in the details to set up your new project</p> */}
          </div>
        </div>

        {/* Section 1: Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Basic Details
            </CardTitle>
            <CardDescription>Enter the essential information about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type *</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Project Description *</Label>
              <Textarea
                id="projectDescription"
                placeholder="Describe your project goals, scope, and key deliverables..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date *</Label>
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
                <Label>Expected Completion Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expectedEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedEndDate ? format(expectedEndDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedEndDate}
                      onSelect={setExpectedEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Optional Details Toggle */}
            <Separator className="my-4" />
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
            >
              <span className="text-muted-foreground">Optional Details (Client Info & Notes)</span>
              {showOptionalDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showOptionalDetails && (
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      placeholder="Client name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientOrg">Organisation Name</Label>
                    <Input
                      id="clientOrg"
                      placeholder="Organisation"
                      value={clientOrganization}
                      onChange={(e) => setClientOrganization(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientContact">Contact Details</Label>
                    <Input
                      id="clientContact"
                      placeholder="Email or phone"
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes or comments..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription>Add team members and assign their roles for this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers
                      .filter(m => !assignedMembers.find(am => am.memberId === m.id))
                      .map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                            </Avatar>
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddTeamMember} disabled={!selectedMember || !selectedRole}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {assignedMembers.length > 0 && (
              <div className="space-y-2">
                {assignedMembers.map((assignment) => {
                  const member = getMemberById(assignment.memberId);
                  if (!member) return null;
                  return (
                    <div
                      key={assignment.memberId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{assignment.role}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveTeamMember(assignment.memberId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {assignedMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No team members added yet</p>
                <p className="text-sm">Select a team member and assign a role to add them</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Departments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Departments
            </CardTitle>
            <CardDescription>Select the departments involved in this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  onClick={() => handleDepartmentToggle(dept.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    selectedDepartments.includes(dept.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <dept.icon className={cn(
                    "h-8 w-8",
                    selectedDepartments.includes(dept.id) ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium text-center">{dept.name}</span>
                  {selectedDepartments.includes(dept.id) && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}

              {/* Custom Departments */}
              {customDepartments.map((dept) => (
                <div
                  key={dept.id}
                  onClick={() => handleDepartmentToggle(dept.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    selectedDepartments.includes(dept.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <dept.icon className={cn(
                    "h-8 w-8",
                    selectedDepartments.includes(dept.id) ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium text-center">{dept.name}</span>
                  {selectedDepartments.includes(dept.id) && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}

              {/* Add Custom Department Button */}
              <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
                <DialogTrigger asChild>
                  <div
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
                  >
                    <Plus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-center text-muted-foreground">Add Custom</span>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Department</DialogTitle>
                    <DialogDescription>
                      Create a new department for this project.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">Department Name</Label>
                      <Input
                        id="dept-name"
                        placeholder="e.g., Marketing, Legal, etc."
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCustomDepartment();
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDeptOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddCustomDepartment} disabled={!newDeptName.trim()}>Add Department</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              Storage
            </CardTitle>
            <CardDescription>Manage project documents, files, and external links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Files & Documents</Label>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports PDF, DOC, XLS, PPT, and image files
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.size}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveAttachment(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Links Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Project Links</Label>
              <div className="flex gap-3">
                <div className="grid gap-3 flex-1 md:grid-cols-2">
                  <Input
                    placeholder="Link Name (e.g., Figma Design)"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                  />
                  <Input
                    placeholder="URL (e.g., https://...)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddLink} disabled={!newLinkName || !newLinkUrl}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Link
                </Button>
              </div>

              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{link.name}</p>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {link.url}
                          </a>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Task Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Task Import
            </CardTitle>
            <CardDescription>
              Upload an Excel or document file to automatically extract and create tasks for your Kanban board
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!taskDocument ? (
              <div
                onClick={handleTaskDocumentUpload}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Upload task list document</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{taskDocument.name}</p>
                      <p className="text-xs text-muted-foreground">{taskDocument.size}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setTaskDocument(null);
                      setExtractedTasks([]);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isProcessing ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground">Processing document and extracting tasks...</p>
                  </div>
                ) : extractedTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{extractedTasks.length} tasks extracted</p>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        Ready for Kanban
                      </Badge>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {extractedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox className="mt-1" defaultChecked />
                            <div>
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs capitalize", getPriorityColor(task.priority))}
                            >
                              {task.priority}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveTask(task.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate("/projects")}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateProject}
            disabled={!projectName || !projectType || !startDate || !expectedEndDate}
          >
            Create Project
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default NewProject;
