import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Building2, 
  Target, 
  Users, 
  Calendar,
  CheckCircle2,
  Circle,
  X,
  FileText,
  History,
  ChevronRight,
  MoreVertical,
  Pencil
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import EditSelectionTemplateDialog from "@/components/edit-selection-template-dialog";
import CreateSelectionTemplateDialog from "@/components/create-selection-template-dialog";
import type { 
  AnalysisSession, 
  InsertAnalysisSession, 
  PropertyProfile,
  SavedSelectionTemplate 
} from "@shared/schema";

// Form schema for creating analysis sessions
const sessionFormSchema = z.object({
  name: z.string().min(1, "Session name is required"),
  description: z.string().optional()
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

// Property selection matrix interface
interface PropertySelection {
  sessionId: string;
  subjectIds: string[];
  competitorIds: string[];
}

// Template with property counts
interface TemplateWithCounts extends SavedSelectionTemplate {
  subjectCount: number;
  competitorCount: number;
}

export default function PropertySelectionMatrix() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"templates" | "history">("templates");
  const [isCreateSessionDialogOpen, setIsCreateSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AnalysisSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [propertySelections, setPropertySelections] = useState<Record<string, PropertySelection>>({});
  
  // Template edit/delete states
  const [editingTemplate, setEditingTemplate] = useState<SavedSelectionTemplate | null>(null);
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Form for session creation/editing
  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: "",
      description: ""
    }
  });

  // Fetch saved selection templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<TemplateWithCounts[]>({
    queryKey: ["/api/saved-selection-templates"],
    enabled: viewMode === "templates",
    queryFn: async () => {
      const response = await fetch("/api/saved-selection-templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data = await response.json();
      return data;
    }
  });

  // Fetch all analysis sessions
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<AnalysisSession[]>({
    queryKey: ["/api/analysis-sessions"],
    enabled: viewMode === "history"
  });

  // Fetch all property profiles
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/property-profiles"],
  });

  // Filter profiles by type
  const subjectProperties = profiles.filter(p => p.profileType === 'subject');
  const competitorProperties = profiles.filter(p => p.profileType === 'competitor');

  // Fetch property profiles for selected session
  const { data: sessionProperties = [] } = useQuery<PropertyProfile[]>({
    queryKey: ["/api/analysis-sessions", selectedSession, "properties"],
    enabled: !!selectedSession && viewMode === "history",
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: string): Promise<{ 
      sessionId: string; 
      scrapingInitiated?: boolean;
      propertiesToScrape?: number;
      message?: string;
    }> => {
      const res = await apiRequest("POST", `/api/saved-selection-templates/${templateId}/apply`, {});
      return res.json();
    },
    onSuccess: (data) => {
      // Show appropriate toast message based on scraping status
      if (data.scrapingInitiated && data.propertiesToScrape) {
        toast({
          title: "Template Applied Successfully",
          description: `Created new session and started scraping ${data.propertiesToScrape} properties. Data will be ready shortly.`,
        });
      } else {
        toast({
          title: "Template Applied",
          description: data.message || "New analysis session created from template.",
        });
      }
      // Navigate to the summarize page with the new session ID
      setLocation(`/session/summarize/${data.sessionId}`);
    },
    onError: (error) => {
      console.error("Error applying template:", error);
      toast({
        title: "Application Failed",
        description: "Failed to apply template. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const res = await apiRequest("DELETE", `/api/saved-selection-templates/${templateId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete template");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-selection-templates"] });
      toast({
        title: "Template Deleted",
        description: "The template has been deleted successfully.",
      });
      setIsDeleteAlertOpen(false);
      setDeletingTemplateId(null);
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete template. Please try again.",
        variant: "destructive",
      });
      setIsDeleteAlertOpen(false);
      setDeletingTemplateId(null);
    }
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: InsertAnalysisSession): Promise<AnalysisSession> => {
      const res = await apiRequest("POST", "/api/analysis-sessions", data);
      return res.json();
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-sessions"] });
      setIsCreateSessionDialogOpen(false);
      setSelectedSession(session.id);
      form.reset();
      toast({
        title: "Analysis Session Created",
        description: "New analysis session has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Error creating session:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create analysis session. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnalysisSession> }): Promise<AnalysisSession> => {
      const res = await apiRequest("PUT", `/api/analysis-sessions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-sessions"] });
      setEditingSession(null);
      form.reset();
      toast({
        title: "Session Updated",
        description: "Analysis session has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating session:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update analysis session. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      await apiRequest("DELETE", `/api/analysis-sessions/${sessionId}`);
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-sessions"] });
      if (selectedSession === sessionId) {
        setSelectedSession(null);
      }
      toast({
        title: "Session Deleted",
        description: "Analysis session has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting session:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete analysis session. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add property to session mutation
  const addPropertyToSessionMutation = useMutation({
    mutationFn: async ({ sessionId, propertyProfileId, role }: {
      sessionId: string;
      propertyProfileId: string;
      role: 'subject' | 'competitor';
    }) => {
      const res = await apiRequest("POST", `/api/analysis-sessions/${sessionId}/properties`, {
        propertyProfileId,
        role
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-sessions", selectedSession, "properties"] });
    }
  });

  // Remove property from session mutation
  const removePropertyFromSessionMutation = useMutation({
    mutationFn: async ({ sessionId, propertyProfileId }: {
      sessionId: string;
      propertyProfileId: string;
    }) => {
      await apiRequest("DELETE", `/api/analysis-sessions/${sessionId}/properties/${propertyProfileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-sessions", selectedSession, "properties"] });
    }
  });

  // Initialize property selections when session properties change
  useEffect(() => {
    if (selectedSession && sessionProperties.length > 0) {
      const subjectIds = sessionProperties.filter(p => p.profileType === 'subject').map(p => p.id);
      const competitorIds = sessionProperties.filter(p => p.profileType === 'competitor').map(p => p.id);
      
      setPropertySelections(prev => ({
        ...prev,
        [selectedSession]: {
          sessionId: selectedSession,
          subjectIds,
          competitorIds
        }
      }));
    }
  }, [selectedSession, sessionProperties]);

  const handleCreateSession = (data: SessionFormData) => {
    createSessionMutation.mutate(data);
  };

  const handleEditSession = (session: AnalysisSession) => {
    setEditingSession(session);
    form.reset({
      name: session.name,
      description: session.description || ""
    });
  };

  const handleUpdateSession = (data: SessionFormData) => {
    if (editingSession) {
      updateSessionMutation.mutate({ id: editingSession.id, data });
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm("Are you sure you want to delete this analysis session? This action cannot be undone.")) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const handlePropertySelection = (propertyId: string, selected: boolean, propertyType: 'subject' | 'competitor') => {
    if (!selectedSession) return;

    if (selected) {
      // Add property to session
      addPropertyToSessionMutation.mutate({
        sessionId: selectedSession,
        propertyProfileId: propertyId,
        role: propertyType
      });
    } else {
      // Remove property from session
      removePropertyFromSessionMutation.mutate({
        sessionId: selectedSession,
        propertyProfileId: propertyId
      });
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    applyTemplateMutation.mutate(templateId);
  };

  const handleEditTemplate = (template: SavedSelectionTemplate) => {
    setEditingTemplate(template);
    setIsEditTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setDeletingTemplateId(templateId);
    setIsDeleteAlertOpen(true);
  };

  const confirmDeleteTemplate = () => {
    if (deletingTemplateId) {
      deleteTemplateMutation.mutate(deletingTemplateId);
    }
  };

  const isPropertySelected = (propertyId: string): boolean => {
    return sessionProperties.some(p => p.id === propertyId);
  };

  const getSelectedPropertiesCount = () => {
    const subjects = sessionProperties.filter(p => p.profileType === 'subject').length;
    const competitors = sessionProperties.filter(p => p.profileType === 'competitor').length;
    return { subjects, competitors };
  };

  const isLoading = viewMode === "templates" ? isLoadingTemplates : (isLoadingSessions || isLoadingProfiles);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="property-selection-matrix-loading">
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">Loading property selection matrix...</div>
        </div>
      </div>
    );
  }

  // Calculate statistics based on current view
  const totalCount = viewMode === "templates" ? templates.length : sessions.length;
  const currentViewLabel = viewMode === "templates" ? "Templates" : "Sessions";

  return (
    <div className="space-y-6" data-testid="property-selection-matrix-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Property Selection Matrix
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            Create analysis sessions and select properties for competitive analysis
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "templates" | "history")}>
          <ToggleGroupItem value="templates" aria-label="Saved Selections" data-testid="toggle-templates">
            <FileText className="h-4 w-4 mr-2" />
            Saved Selections
          </ToggleGroupItem>
          <ToggleGroupItem value="history" aria-label="Session History" data-testid="toggle-history">
            <History className="h-4 w-4 mr-2" />
            Session History
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card data-testid="card-total-count">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {currentViewLabel}</CardTitle>
            {viewMode === "templates" ? (
              <FileText className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Calendar className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">
              {totalCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === "templates" ? "Saved templates" : "Analysis sessions"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-subject-properties">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subject Properties</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-subjects-count">
              {subjectProperties.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for analysis
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-competitor-properties">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-competitors-count">
              {competitorProperties.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for comparison
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-selected-properties">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === "history" ? "Selected Properties" : "Total Properties"}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-selected-count">
              {viewMode === "history" && selectedSession 
                ? getSelectedPropertiesCount().subjects + getSelectedPropertiesCount().competitors 
                : subjectProperties.length + competitorProperties.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === "history" && selectedSession ? "In current session" : "Total available"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {viewMode === "templates" ? (
        /* Saved Selections View */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Saved Selection Templates</h2>
              <Badge variant="secondary">{templates.length} templates</Badge>
            </div>
            <Button 
              className="flex items-center gap-2" 
              data-testid="button-add-template"
              onClick={() => setIsCreateTemplateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add New Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="h-[calc(100vh-400px)] flex items-center justify-center">
              <div className="text-center p-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Saved Templates Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first selection template to quickly set up analysis sessions
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setIsCreateTemplateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow relative" data-testid={`template-card-${template.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-2">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-start gap-2">
                        {template.icon && (
                          <div className="text-2xl">{template.icon}</div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              data-testid={`button-template-menu-${template.id}`}
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditTemplate(template)}
                              data-testid={`menu-edit-template-${template.id}`}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`menu-delete-template-${template.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {template.subjectCount || 0} Subjects
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-secondary" />
                          <span className="text-sm font-medium">
                            {template.competitorCount || 0} Competitors
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => handleApplyTemplate(template.id)}
                      disabled={applyTemplateMutation.isPending}
                      data-testid={`button-apply-template-${template.id}`}
                    >
                      {applyTemplateMutation.isPending ? "Applying..." : (
                        <>
                          <ChevronRight className="h-4 w-4 mr-1" />
                          Apply Template
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Session History View (existing functionality) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analysis Sessions List */}
          <Card data-testid="card-sessions-list">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle>Analysis Sessions</CardTitle>
                  <Badge variant="secondary">{sessions.length} sessions</Badge>
                </div>
                <Button
                  onClick={() => setIsCreateSessionDialogOpen(true)}
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid="button-create-session"
                >
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-400px)] w-full">
                {sessions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8" data-testid="empty-sessions">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No analysis sessions yet</p>
                    <p className="text-sm">Create your first session to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSession === session.id 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:bg-accent"
                        }`}
                        onClick={() => setSelectedSession(session.id)}
                        data-testid={`session-item-${session.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{session.name}</h4>
                            {session.description && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {session.description}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              Created {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Unknown'}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSession(session);
                              }}
                              data-testid={`button-edit-session-${session.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              data-testid={`button-delete-session-${session.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Property Selection Matrix */}
          <div className="lg:col-span-2">
            <Card data-testid="card-property-matrix">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Property Selection Matrix</CardTitle>
                  {selectedSession && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" data-testid="badge-selected-subjects">
                        {getSelectedPropertiesCount().subjects} Subjects
                      </Badge>
                      <Badge variant="outline" data-testid="badge-selected-competitors">
                        {getSelectedPropertiesCount().competitors} Competitors
                      </Badge>
                      <Button 
                        size="sm" 
                        data-testid="button-start-analysis"
                        onClick={() => setLocation(`/session/summarize/${selectedSession}`)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Analysis
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedSession ? (
                  <div className="text-center text-muted-foreground py-16" data-testid="no-session-selected">
                    <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">No Session Selected</h3>
                    <p className="text-sm">
                      Select an analysis session from the list on the left to view and manage property selections
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Subject Properties Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Subject Properties</h3>
                        <Badge variant="secondary">
                          {subjectProperties.length} available
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subjectProperties.map((property) => (
                          <div
                            key={property.id}
                            className="flex items-center space-x-3 p-3 rounded-lg border bg-card"
                            data-testid={`subject-property-${property.id}`}
                          >
                            <Checkbox
                              checked={isPropertySelected(property.id)}
                              onCheckedChange={(checked) => 
                                handlePropertySelection(property.id, !!checked, 'subject')
                              }
                              data-testid={`checkbox-subject-${property.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{property.name}</h4>
                              <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                              {property.totalUnits && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {property.totalUnits} units
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        {subjectProperties.length === 0 && (
                          <div className="col-span-2 text-center text-muted-foreground py-8" data-testid="no-subject-properties">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No subject properties available</p>
                            <p className="text-sm">Add subject properties in Property Profiles</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Competitor Properties Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-secondary" />
                        <h3 className="font-medium">Competitor Properties</h3>
                        <Badge variant="secondary">
                          {competitorProperties.length} available
                        </Badge>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                          {competitorProperties.map((property) => (
                            <div
                              key={property.id}
                              className="flex items-center space-x-3 p-3 rounded-lg border bg-card"
                              data-testid={`competitor-property-${property.id}`}
                            >
                              <Checkbox
                                checked={isPropertySelected(property.id)}
                                onCheckedChange={(checked) => 
                                  handlePropertySelection(property.id, !!checked, 'competitor')
                                }
                                data-testid={`checkbox-competitor-${property.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{property.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                                <div className="flex gap-1 mt-1">
                                  {property.totalUnits && (
                                    <Badge variant="outline" className="text-xs">
                                      {property.totalUnits} units
                                    </Badge>
                                  )}
                                  {property.distance && (
                                    <Badge variant="outline" className="text-xs">
                                      {property.distance} mi
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {competitorProperties.length === 0 && (
                            <div className="col-span-2 text-center text-muted-foreground py-8" data-testid="no-competitor-properties">
                              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No competitor properties available</p>
                              <p className="text-sm">Add competitor properties in Property Profiles</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Create Session Dialog */}
      <Dialog open={isCreateSessionDialogOpen} onOpenChange={setIsCreateSessionDialogOpen}>
        <DialogContent data-testid="dialog-create-session">
          <DialogHeader>
            <DialogTitle>Create New Analysis Session</DialogTitle>
            <DialogDescription>
              Create a new analysis session to group properties for competitive analysis
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateSession)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter session name..."
                        data-testid="input-session-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter session description..."
                        data-testid="textarea-session-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateSessionDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSessionMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
        <DialogContent data-testid="dialog-edit-session">
          <DialogHeader>
            <DialogTitle>Edit Analysis Session</DialogTitle>
            <DialogDescription>
              Update the name and description of this analysis session
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateSession)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter session name..."
                        data-testid="input-edit-session-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter session description..."
                        data-testid="textarea-edit-session-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingSession(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSessionMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateSessionMutation.isPending ? "Updating..." : "Update Session"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <EditSelectionTemplateDialog
        template={editingTemplate}
        isOpen={isEditTemplateDialogOpen}
        onClose={() => {
          setIsEditTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          setIsEditTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
      />

      {/* Create Template Dialog */}
      <CreateSelectionTemplateDialog
        isOpen={isCreateTemplateDialogOpen}
        onClose={() => setIsCreateTemplateDialogOpen(false)}
        onSuccess={() => setIsCreateTemplateDialogOpen(false)}
      />

      {/* Delete Template Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent data-testid="alert-dialog-delete-template">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteAlertOpen(false);
                setDeletingTemplateId(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              disabled={deleteTemplateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}