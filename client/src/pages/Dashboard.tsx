import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Briefcase, 
  FileText, 
  Send, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Plus
} from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: stats, isLoading: statsLoading } = trpc.applications.stats.useQuery();
  const { data: applications, isLoading: appsLoading } = trpc.applications.list.useQuery();
  const { data: resumes } = trpc.resume.list.useQuery();

  const recentApplications = applications?.slice(0, 5) ?? [];

  const statCards = [
    { 
      title: "Total Applications", 
      value: stats?.total ?? 0, 
      icon: Send, 
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      title: "Interviews", 
      value: stats?.interviews ?? 0, 
      icon: Users, 
      color: "text-green-400",
      bgColor: "bg-green-500/10"
    },
    { 
      title: "Offers", 
      value: stats?.offers ?? 0, 
      icon: TrendingUp, 
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10"
    },
    { 
      title: "Pending", 
      value: stats?.pending ?? 0, 
      icon: Clock, 
      color: "text-blue-400",
      bgColor: "bg-blue-500/10"
    },
  ];

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'there'}!</h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your job search progress
            </p>
          </div>
          <Button onClick={() => setLocation("/jobs")}>
            <Plus className="w-4 h-4 mr-2" />
            Find Jobs
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

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Applications */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Your latest job applications</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/applications")}>
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                      <div className="w-10 h-10 rounded-lg shimmer" />
                      <div className="flex-1 space-y-2">
                        <div className="w-32 h-4 shimmer rounded" />
                        <div className="w-24 h-3 shimmer rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentApplications.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No applications yet</p>
                  <Button onClick={() => setLocation("/jobs")}>
                    Start Applying
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <div 
                      key={app.id} 
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/applications`)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{app.job?.title || 'Unknown Position'}</p>
                        <p className="text-sm text-muted-foreground truncate">{app.job?.company || 'Unknown Company'}</p>
                      </div>
                      <span className={getStatusBadge(app.status)}>
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks at your fingertips</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12"
                  onClick={() => setLocation("/jobs")}
                >
                  <Briefcase className="w-4 h-4 mr-3" />
                  Browse Jobs
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12"
                  onClick={() => setLocation("/profile")}
                >
                  <FileText className="w-4 h-4 mr-3" />
                  Update Profile
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12"
                  onClick={() => setLocation("/templates")}
                >
                  <FileText className="w-4 h-4 mr-3" />
                  Manage Templates
                </Button>
              </CardContent>
            </Card>

            {/* Resume Status */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Your Resumes</CardTitle>
                <CardDescription>Manage your uploaded resumes</CardDescription>
              </CardHeader>
              <CardContent>
                {resumes && resumes.length > 0 ? (
                  <div className="space-y-3">
                    {resumes.slice(0, 3).map((resume) => (
                      <div key={resume.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <FileText className="w-5 h-5 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{resume.name}</p>
                          {resume.isDefault && (
                            <span className="text-xs text-primary">Default</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setLocation("/profile")}
                    >
                      Manage Resumes
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No resumes uploaded</p>
                    <Button size="sm" onClick={() => setLocation("/profile")}>
                      Upload Resume
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
