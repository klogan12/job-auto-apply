import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Clock,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Loader2
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: job, isLoading } = trpc.jobs.get.useQuery({ id: parseInt(id || "0") });
  const { data: resumes } = trpc.resume.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: templates } = trpc.templates.list.useQuery({ type: "cover_letter" }, { enabled: isAuthenticated });
  const { data: applications } = trpc.applications.list.useQuery(undefined, { enabled: isAuthenticated });

  const createApplication = trpc.applications.create.useMutation({
    onSuccess: () => {
      toast.success("Application created successfully!");
      setShowApplyDialog(false);
      setLocation("/applications");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const generateCoverLetter = trpc.templates.generateCoverLetter.useMutation({
    onSuccess: (data) => {
      setCoverLetter(typeof data.content === 'string' ? data.content : '');
      setIsGenerating(false);
      toast.success("Cover letter generated!");
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(error.message);
    }
  });

  const hasApplied = applications?.some(app => app.jobId === parseInt(id || "0"));

  const handleApply = () => {
    if (!selectedResume) {
      toast.error("Please select a resume");
      return;
    }
    createApplication.mutate({
      jobId: parseInt(id || "0"),
      resumeId: parseInt(selectedResume),
      templateId: selectedTemplate ? parseInt(selectedTemplate) : undefined,
      coverLetter: coverLetter || undefined,
    });
  };

  const handleGenerateCoverLetter = () => {
    setIsGenerating(true);
    generateCoverLetter.mutate({ jobId: parseInt(id || "0") });
  };

  const formatSalary = (min?: number | null, max?: number | null, salary?: string | null) => {
    if (salary) return salary;
    if (min && max) return `$${(min/1000).toFixed(0)}k - $${(max/1000).toFixed(0)}k`;
    if (min) return `From $${(min/1000).toFixed(0)}k`;
    if (max) return `Up to $${(max/1000).toFixed(0)}k`;
    return null;
  };

  const getLocationTypeBadge = (type: string | null) => {
    const styles: Record<string, string> = {
      remote: "bg-green-500/20 text-green-400",
      hybrid: "bg-yellow-500/20 text-yellow-400",
      onsite: "bg-blue-500/20 text-blue-400",
    };
    return styles[type || "onsite"] || styles.onsite;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="w-32 h-8 shimmer rounded" />
          <Card className="border-border/50">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="w-64 h-8 shimmer rounded" />
                <div className="w-48 h-6 shimmer rounded" />
                <div className="w-full h-32 shimmer rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Job not found</h2>
          <p className="text-muted-foreground mb-4">This job listing may have been removed.</p>
          <Button onClick={() => setLocation("/jobs")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => setLocation("/jobs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>

        {/* Job Header */}
        <Card className="border-border/50">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Company Logo */}
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.company} className="w-12 h-12 rounded-lg" />
                ) : (
                  <Building2 className="w-8 h-8 text-primary" />
                )}
              </div>

              {/* Job Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">{job.title}</h1>
                    <p className="text-lg text-muted-foreground mt-1">{job.company}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-badge ${getLocationTypeBadge(job.locationType)}`}>
                      {job.locationType || "onsite"}
                    </span>
                    {hasApplied ? (
                      <Button disabled className="gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Applied
                      </Button>
                    ) : isAuthenticated ? (
                      <Button onClick={() => setShowApplyDialog(true)}>
                        Apply Now
                      </Button>
                    ) : (
                      <Button onClick={() => setLocation("/")}>
                        Sign in to Apply
                      </Button>
                    )}
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                  )}
                  {formatSalary(job.salaryMin, job.salaryMax, job.salary) && (
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      {formatSalary(job.salaryMin, job.salaryMax, job.salary)}
                    </span>
                  )}
                  {job.employmentType && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      {job.employmentType}
                    </span>
                  )}
                  {job.postedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Posted {new Date(job.postedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Details Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>About this role</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {job.description || "No description provided."}
                </p>
              </CardContent>
            </Card>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-1 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-1 shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Apply Card */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Quick Apply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasApplied ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="font-medium">You've already applied</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check your applications for status updates
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation("/applications")}
                    >
                      View Applications
                    </Button>
                  </div>
                ) : isAuthenticated ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Apply with your saved profile and resume
                    </p>
                    <Button className="w-full" onClick={() => setShowApplyDialog(true)}>
                      Apply Now
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Sign in to apply for this position
                    </p>
                    <Button className="w-full" onClick={() => setLocation("/")}>
                      Sign in to Apply
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>About {job.company}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{job.company}</p>
                    <p className="text-sm text-muted-foreground">{job.location}</p>
                  </div>
                </div>
                {job.applicationUrl && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Company Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>
              at {job.company}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Resume Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Resume *</label>
              {resumes && resumes.length > 0 ? (
                <Select value={selectedResume} onValueChange={setSelectedResume}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id.toString()}>
                        {resume.name} {resume.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  No resumes uploaded. <Button variant="link" className="p-0 h-auto" onClick={() => setLocation("/profile")}>Upload one</Button>
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover Letter Template (Optional)</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cover Letter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cover Letter</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleGenerateCoverLetter}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                placeholder="Write your cover letter or generate one with AI..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={!selectedResume || createApplication.isPending}
            >
              {createApplication.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
