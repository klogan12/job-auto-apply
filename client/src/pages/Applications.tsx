import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Briefcase, 
  Building2, 
  Clock, 
  FileText,
  ExternalLink,
  MoreVertical,
  Eye,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ApplicationStatus = "draft" | "pending" | "submitted" | "viewed" | "interview" | "offered" | "rejected" | "withdrawn";

export default function Applications() {
  const [, setLocation] = useLocation();
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: applications, isLoading, refetch } = trpc.applications.list.useQuery();
  const { data: stats } = trpc.applications.stats.useQuery();

  const updateApplication = trpc.applications.update.useMutation({
    onSuccess: () => {
      toast.success("Application updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const withdrawApplication = trpc.applications.withdraw.useMutation({
    onSuccess: () => {
      toast.success("Application withdrawn");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      draft: "status-badge status-draft",
      pending: "status-badge status-pending",
      submitted: "status-badge status-submitted",
      viewed: "status-badge status-submitted",
      interview: "status-badge status-interview",
      offered: "status-badge status-offered",
      rejected: "status-badge status-rejected",
      withdrawn: "status-badge status-withdrawn",
    };
    return statusClasses[status] || "status-badge status-draft";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      pending: "Pending",
      submitted: "Submitted",
      viewed: "Viewed",
      interview: "Interview",
      offered: "Offered",
      rejected: "Rejected",
      withdrawn: "Withdrawn",
    };
    return labels[status] || status;
  };

  const filteredApplications = applications?.filter(app => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return ["pending", "submitted", "viewed", "interview"].includes(app.status);
    if (activeTab === "completed") return ["offered", "rejected", "withdrawn"].includes(app.status);
    return app.status === activeTab;
  });

  const selectedApplication = applications?.find(app => app.id === selectedApp);

  const handleSaveNotes = () => {
    if (selectedApp) {
      updateApplication.mutate({ id: selectedApp, notes });
      setShowDetailsDialog(false);
    }
  };

  const handleWithdraw = (id: number) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      withdrawApplication.mutate({ id });
    }
  };

  const statCards = [
    { label: "Total", value: stats?.total ?? 0, color: "text-foreground" },
    { label: "Submitted", value: stats?.submitted ?? 0, color: "text-primary" },
    { label: "Interviews", value: stats?.interviews ?? 0, color: "text-green-400" },
    { label: "Offers", value: stats?.offers ?? 0, color: "text-yellow-400" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Applications</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your job applications
            </p>
          </div>
          <Button onClick={() => setLocation("/jobs")}>
            Find More Jobs
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="interview">Interviews</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-lg shimmer" />
                        <div className="flex-1 space-y-3">
                          <div className="w-48 h-5 shimmer rounded" />
                          <div className="w-32 h-4 shimmer rounded" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredApplications?.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === "all" 
                      ? "Start applying to jobs to see them here"
                      : "No applications match this filter"
                    }
                  </p>
                  <Button onClick={() => setLocation("/jobs")}>
                    Browse Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications?.map((app) => (
                  <Card key={app.id} className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Company Logo */}
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {app.job?.companyLogo ? (
                            <img src={app.job.companyLogo} alt={app.job.company} className="w-8 h-8 rounded" />
                          ) : (
                            <Building2 className="w-6 h-6 text-primary" />
                          )}
                        </div>

                        {/* Application Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div>
                              <h3 
                                className="font-semibold text-lg hover:text-primary cursor-pointer transition-colors"
                                onClick={() => app.job && setLocation(`/jobs/${app.job.id}`)}
                              >
                                {app.job?.title || "Unknown Position"}
                              </h3>
                              <p className="text-muted-foreground">{app.job?.company || "Unknown Company"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={getStatusBadge(app.status)}>
                                {getStatusLabel(app.status)}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedApp(app.id);
                                    setNotes(app.notes || "");
                                    setShowDetailsDialog(true);
                                  }}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {app.job && (
                                    <DropdownMenuItem onClick={() => setLocation(`/jobs/${app.job!.id}`)}>
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      View Job
                                    </DropdownMenuItem>
                                  )}
                                  {!["rejected", "withdrawn", "offered"].includes(app.status) && (
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => handleWithdraw(app.id)}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Withdraw
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                            {app.job?.location && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {app.job.location}
                              </span>
                            )}
                            {app.appliedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Applied {new Date(app.appliedAt).toLocaleDateString()}
                              </span>
                            )}
                            {app.lastStatusUpdate && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                Updated {new Date(app.lastStatusUpdate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {app.notes && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2 bg-muted/30 p-2 rounded">
                              {app.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {selectedApplication?.job?.title} at {selectedApplication?.job?.company}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Status</span>
              <span className={getStatusBadge(selectedApplication?.status || "draft")}>
                {getStatusLabel(selectedApplication?.status || "draft")}
              </span>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Timeline</span>
              <div className="space-y-2 text-sm text-muted-foreground">
                {selectedApplication?.createdAt && (
                  <p>Created: {new Date(selectedApplication.createdAt).toLocaleString()}</p>
                )}
                {selectedApplication?.appliedAt && (
                  <p>Applied: {new Date(selectedApplication.appliedAt).toLocaleString()}</p>
                )}
                {selectedApplication?.lastStatusUpdate && (
                  <p>Last Update: {new Date(selectedApplication.lastStatusUpdate).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Cover Letter */}
            {selectedApplication?.coverLetter && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Cover Letter</span>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {selectedApplication.coverLetter}
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Personal Notes</label>
              <Textarea
                placeholder="Add notes about this application..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={updateApplication.isPending}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
