import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Briefcase, 
  Send, 
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Globe,
  Loader2,
  Shield,
  Database
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [showJobBoardDialog, setShowJobBoardDialog] = useState(false);
  const [editingJobBoard, setEditingJobBoard] = useState<number | null>(null);
  const [jobBoardForm, setJobBoardForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    websiteUrl: "",
    apiEndpoint: "",
    isActive: true,
  });

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  
  const { data: jobBoards, refetch: refetchJobBoards } = trpc.admin.jobBoards.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const createJobBoard = trpc.admin.jobBoards.create.useMutation({
    onSuccess: () => {
      toast.success("Job board created");
      refetchJobBoards();
      resetJobBoardForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateJobBoard = trpc.admin.jobBoards.update.useMutation({
    onSuccess: () => {
      toast.success("Job board updated");
      refetchJobBoards();
      resetJobBoardForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteJobBoard = trpc.admin.jobBoards.delete.useMutation({
    onSuccess: () => {
      toast.success("Job board deleted");
      refetchJobBoards();
    },
    onError: (error) => toast.error(error.message),
  });

  const seedJobs = trpc.admin.seedJobs.useMutation({
    onSuccess: (data) => {
      toast.success(`Seeded ${data.count} sample jobs`);
    },
    onError: (error) => toast.error(error.message),
  });

  const resetJobBoardForm = () => {
    setShowJobBoardDialog(false);
    setEditingJobBoard(null);
    setJobBoardForm({
      name: "",
      slug: "",
      logoUrl: "",
      websiteUrl: "",
      apiEndpoint: "",
      isActive: true,
    });
  };

  const handleEditJobBoard = (board: {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    apiEndpoint: string | null;
    isActive: boolean | null;
  }) => {
    setEditingJobBoard(board.id);
    setJobBoardForm({
      name: board.name,
      slug: board.slug,
      logoUrl: board.logoUrl || "",
      websiteUrl: board.websiteUrl || "",
      apiEndpoint: board.apiEndpoint || "",
      isActive: board.isActive ?? true,
    });
    setShowJobBoardDialog(true);
  };

  const handleSaveJobBoard = () => {
    if (!jobBoardForm.name.trim() || !jobBoardForm.slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    if (editingJobBoard) {
      updateJobBoard.mutate({
        id: editingJobBoard,
        name: jobBoardForm.name,
        logoUrl: jobBoardForm.logoUrl || undefined,
        websiteUrl: jobBoardForm.websiteUrl || undefined,
        apiEndpoint: jobBoardForm.apiEndpoint || undefined,
        isActive: jobBoardForm.isActive,
      });
    } else {
      createJobBoard.mutate({
        name: jobBoardForm.name,
        slug: jobBoardForm.slug,
        logoUrl: jobBoardForm.logoUrl || undefined,
        websiteUrl: jobBoardForm.websiteUrl || undefined,
        apiEndpoint: jobBoardForm.apiEndpoint || undefined,
        isActive: jobBoardForm.isActive,
      });
    }
  };

  const handleDeleteJobBoard = (id: number) => {
    if (confirm("Are you sure you want to delete this job board?")) {
      deleteJobBoard.mutate({ id });
    }
  };

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the admin panel.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { 
      title: "Total Users", 
      value: stats?.totalUsers ?? 0, 
      icon: Users, 
      color: "text-blue-400",
      bgColor: "bg-blue-500/10"
    },
    { 
      title: "Total Jobs", 
      value: stats?.totalJobs ?? 0, 
      icon: Briefcase, 
      color: "text-green-400",
      bgColor: "bg-green-500/10"
    },
    { 
      title: "Total Applications", 
      value: stats?.totalApplications ?? 0, 
      icon: Send, 
      color: "text-purple-400",
      bgColor: "bg-purple-500/10"
    },
    { 
      title: "Avg Success Rate", 
      value: `${stats?.avgSuccessRate ?? 0}%`, 
      icon: TrendingUp, 
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">
              Manage job boards and monitor platform statistics
            </p>
          </div>
          <Button onClick={() => seedJobs.mutate()} disabled={seedJobs.isPending}>
            {seedJobs.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Seed Sample Jobs
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">
                      {statsLoading ? (
                        <span className="inline-block w-12 h-8 shimmer rounded" />
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Job Boards Management */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Job Board Integrations</CardTitle>
              <CardDescription>Manage connected job boards and their settings</CardDescription>
            </div>
            <Button onClick={() => setShowJobBoardDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Job Board
            </Button>
          </CardHeader>
          <CardContent>
            {jobBoards?.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No job boards configured</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first job board integration to start pulling jobs
                </p>
                <Button onClick={() => setShowJobBoardDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Job Board
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobBoards?.map((board) => (
                  <div
                    key={board.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      {board.logoUrl ? (
                        <img src={board.logoUrl} alt={board.name} className="w-8 h-8 rounded" />
                      ) : (
                        <Globe className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{board.name}</h4>
                        <span className={`status-badge ${board.isActive ? "status-interview" : "status-draft"}`}>
                          {board.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {board.websiteUrl || board.slug} • {board.totalApplications ?? 0} applications • {board.successRate ?? 0}% success rate
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditJobBoard(board)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteJobBoard(board.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => seedJobs.mutate()}
                disabled={seedJobs.isPending}
              >
                <Database className="w-5 h-5" />
                <span>Seed Sample Jobs</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => setShowJobBoardDialog(true)}
              >
                <Plus className="w-5 h-5" />
                <span>Add Job Board</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => setLocation("/jobs")}
              >
                <Briefcase className="w-5 h-5" />
                <span>View All Jobs</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Board Dialog */}
      <Dialog open={showJobBoardDialog} onOpenChange={(open) => !open && resetJobBoardForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingJobBoard ? "Edit Job Board" : "Add Job Board"}
            </DialogTitle>
            <DialogDescription>
              {editingJobBoard 
                ? "Update the job board configuration"
                : "Configure a new job board integration"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={jobBoardForm.name}
                  onChange={(e) => setJobBoardForm({ ...jobBoardForm, name: e.target.value })}
                  placeholder="LinkedIn Jobs"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={jobBoardForm.slug}
                  onChange={(e) => setJobBoardForm({ ...jobBoardForm, slug: e.target.value })}
                  placeholder="linkedin"
                  disabled={!!editingJobBoard}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={jobBoardForm.websiteUrl}
                onChange={(e) => setJobBoardForm({ ...jobBoardForm, websiteUrl: e.target.value })}
                placeholder="https://linkedin.com/jobs"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={jobBoardForm.logoUrl}
                onChange={(e) => setJobBoardForm({ ...jobBoardForm, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label>API Endpoint</Label>
              <Input
                value={jobBoardForm.apiEndpoint}
                onChange={(e) => setJobBoardForm({ ...jobBoardForm, apiEndpoint: e.target.value })}
                placeholder="https://api.example.com/jobs"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this job board integration
                </p>
              </div>
              <Switch
                checked={jobBoardForm.isActive}
                onCheckedChange={(checked) => setJobBoardForm({ ...jobBoardForm, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetJobBoardForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveJobBoard}
              disabled={createJobBoard.isPending || updateJobBoard.isPending}
            >
              {(createJobBoard.isPending || updateJobBoard.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingJobBoard ? "Save Changes" : "Add Job Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
