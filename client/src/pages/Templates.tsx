import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Star,
  Copy,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TemplateType = "cover_letter" | "application_form";

export default function Templates() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateType>("cover_letter");
  
  const [formData, setFormData] = useState({
    name: "",
    type: "cover_letter" as TemplateType,
    content: "",
    isDefault: false,
  });

  const { data: templates, refetch } = trpc.templates.list.useQuery({ type: activeTab });

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      refetch();
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      refetch();
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: activeTab,
      content: "",
      isDefault: false,
    });
  };

  const handleEdit = (template: { id: number; name: string; type: string; content: string; isDefault: boolean | null }) => {
    setEditingTemplate(template.id);
    setFormData({
      name: template.name,
      type: template.type as TemplateType,
      content: template.content,
      isDefault: template.isDefault ?? false,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Please enter template content");
      return;
    }

    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate,
        name: formData.name,
        content: formData.content,
        isDefault: formData.isDefault,
      });
    } else {
      createTemplate.mutate({
        name: formData.name,
        type: formData.type,
        content: formData.content,
        isDefault: formData.isDefault,
        variables: extractVariables(formData.content),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplate.mutate({ id });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Template copied to clipboard");
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{|\}\}/g, ""))));
  };

  const defaultCoverLetterTemplate = `Dear Hiring Manager,

I am writing to express my strong interest in the {{position}} position at {{company}}. With my background in {{skills}}, I am confident that I would be a valuable addition to your team.

{{summary}}

I am particularly drawn to {{company}} because of its commitment to innovation and excellence. I believe my experience aligns well with the requirements of this role, and I am excited about the opportunity to contribute to your team's success.

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can benefit {{company}}.

Sincerely,
{{name}}`;

  const defaultApplicationFormTemplate = `Professional Summary:
{{summary}}

Key Skills:
{{skills}}

Why I'm interested in this role:
I am excited about the opportunity to join {{company}} as a {{position}}. My experience in the field has prepared me well for this role, and I am eager to contribute to your team's success.

Availability:
I am available to start immediately and am flexible with working arrangements.

References:
Available upon request.`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your application templates
            </p>
          </div>
          <Button onClick={() => {
            setFormData({ ...formData, type: activeTab });
            setShowDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-border/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Template Variables</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use variables like <code className="bg-muted px-1 rounded">{"{{name}}"}</code>, 
                  <code className="bg-muted px-1 rounded ml-1">{"{{company}}"}</code>, 
                  <code className="bg-muted px-1 rounded ml-1">{"{{position}}"}</code>, 
                  <code className="bg-muted px-1 rounded ml-1">{"{{skills}}"}</code>, and 
                  <code className="bg-muted px-1 rounded ml-1">{"{{summary}}"}</code> to personalize your templates automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
          <TabsList>
            <TabsTrigger value="cover_letter">Cover Letters</TabsTrigger>
            <TabsTrigger value="application_form">Application Forms</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {templates?.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first {activeTab === "cover_letter" ? "cover letter" : "application form"} template
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button onClick={() => {
                      setFormData({
                        name: activeTab === "cover_letter" ? "Default Cover Letter" : "Default Application Form",
                        type: activeTab,
                        content: activeTab === "cover_letter" ? defaultCoverLetterTemplate : defaultApplicationFormTemplate,
                        isDefault: true,
                      });
                      setShowDialog(true);
                    }}>
                      Use Default Template
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setFormData({ ...formData, type: activeTab });
                      setShowDialog(true);
                    }}>
                      Create from Scratch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {templates?.map((template) => (
                  <Card key={template.id} className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.isDefault && (
                            <Star className="w-4 h-4 text-primary fill-current" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopy(template.content)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Created {new Date(template.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {template.content}
                      </p>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {template.variables.map((v) => (
                            <span key={v} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Update your template content and settings"
                : "Create a new template for your job applications"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Cover Letter Template"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v as TemplateType })}
                  disabled={!!editingTemplate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover_letter">Cover Letter</SelectItem>
                    <SelectItem value="application_form">Application Form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your template content here..."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {"{{name}}"}, {"{{company}}"}, {"{{position}}"}, {"{{skills}}"}, {"{{summary}}"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isDefault">Set as default template</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createTemplate.isPending || updateTemplate.isPending}
            >
              {(createTemplate.isPending || updateTemplate.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
