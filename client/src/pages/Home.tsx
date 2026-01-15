import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Briefcase, 
  Building2, 
  Mail, 
  Upload, 
  X, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  FileText,
  Sparkles,
  Zap
} from "lucide-react";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { getCompanySuggestions } from "@/data/companies";
import { getJobRoleSuggestions, popularJobRoles } from "@/data/jobRoles";
import { searchCompaniesApi, searchJobRolesExpanded } from "@/lib/searchApi";

export default function Home() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [seekerData, setSeekerData] = useState<{
    isActive: boolean;
    resumeFileName?: string | null;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upsertMutation = trpc.jobSeeker.upsert.useMutation();
  const uploadResumeMutation = trpc.jobSeeker.uploadResume.useMutation();
  const toggleActiveMutation = trpc.jobSeeker.toggleActive.useMutation();
  
  const { data: existingSeeker, refetch: refetchSeeker } = trpc.jobSeeker.getByEmail.useQuery(
    { email },
    { enabled: email.includes("@") && email.includes(".") }
  );
  
  const { data: applications } = trpc.jobSeeker.getApplications.useQuery(
    { email },
    { enabled: isRegistered && !!email }
  );
  
  const { data: stats } = trpc.jobSeeker.getStats.useQuery(
    { email },
    { enabled: isRegistered && !!email }
  );

  // Load existing data when email is found
  const handleEmailBlur = () => {
    if (existingSeeker) {
      setName(existingSeeker.name || "");
      setPhone(existingSeeker.phone || "");
      setTargetCompanies(existingSeeker.targetCompanies || []);
      setTargetRoles(existingSeeker.targetRoles || []);
      setSeekerData({
        isActive: existingSeeker.isActive,
        resumeFileName: existingSeeker.resumeFileName,
      });
      setIsRegistered(true);
      toast.success("Welcome back! Your profile has been loaded.");
    }
  };

  const addCompany = () => {
    const trimmed = companyInput.trim();
    if (trimmed && !targetCompanies.includes(trimmed)) {
      setTargetCompanies([...targetCompanies, trimmed]);
      setCompanyInput("");
    }
  };

  const removeCompany = (company: string) => {
    setTargetCompanies(targetCompanies.filter(c => c !== company));
  };

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (trimmed && !targetRoles.includes(trimmed)) {
      setTargetRoles([...targetRoles, trimmed]);
      setRoleInput("");
    }
  };

  const removeRole = (role: string) => {
    setTargetRoles(targetRoles.filter(r => r !== role));
  };

  // API search callbacks for autocomplete
  const handleCompanyApiSearch = useCallback(async (query: string): Promise<string[]> => {
    return searchCompaniesApi(query);
  }, []);

  const handleRoleApiSearch = useCallback(async (query: string): Promise<string[]> => {
    return searchJobRolesExpanded(query, popularJobRoles);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setResumeFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (targetCompanies.length === 0) {
      toast.error("Please add at least one target company");
      return;
    }
    if (targetRoles.length === 0) {
      toast.error("Please add at least one target role");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save profile
      await upsertMutation.mutateAsync({
        email,
        name: name || undefined,
        phone: phone || undefined,
        targetCompanies,
        targetRoles,
        isActive: true,
      });

      // Upload resume if provided
      if (resumeFile) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          await uploadResumeMutation.mutateAsync({
            email,
            fileName: resumeFile.name,
            fileData: base64,
            mimeType: resumeFile.type,
          });
        };
        reader.readAsDataURL(resumeFile);
      }

      setIsRegistered(true);
      setSeekerData({ isActive: true, resumeFileName: resumeFile?.name });
      await refetchSeeker();
      toast.success("You're all set! We'll automatically apply to matching jobs for you.");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const result = await toggleActiveMutation.mutateAsync({ email });
      setSeekerData(prev => prev ? { ...prev, isActive: result.isActive } : null);
      toast.success(result.isActive ? "Auto-apply enabled" : "Auto-apply paused");
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-cyan-600/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              Automated Job Applications
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Land Your Dream Job
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                Automatically
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Tell us your target companies and roles. Upload your resume. 
              We'll automatically apply to matching positions as soon as they open.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="container mx-auto px-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                <Zap className="h-6 w-6 text-violet-400" />
                {isRegistered ? "Your Auto-Apply Dashboard" : "Get Started"}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {isRegistered 
                  ? "Manage your preferences and track applications" 
                  : "Set up your profile in minutes"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                  disabled={isRegistered}
                />
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Name (Optional)</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    disabled={isRegistered}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    disabled={isRegistered}
                  />
                </div>
              </div>

              <Separator className="bg-slate-800" />

              {/* Target Companies */}
              <div className="space-y-3">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Target Companies
                </Label>
                <AutocompleteInput
                  placeholder="e.g., Google, Microsoft, Apple..."
                  value={companyInput}
                  onChange={setCompanyInput}
                  onAdd={addCompany}
                  getSuggestions={getCompanySuggestions}
                  onApiSearch={handleCompanyApiSearch}
                  disabled={isRegistered}
                />
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {targetCompanies.map((company) => (
                    <Badge 
                      key={company} 
                      variant="secondary" 
                      className="bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 gap-1 pr-1"
                    >
                      {company}
                      {!isRegistered && (
                        <button onClick={() => removeCompany(company)} className="ml-1 hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Target Roles */}
              <div className="space-y-3">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Target Job Roles
                </Label>
                <AutocompleteInput
                  placeholder="e.g., Software Engineer, Product Manager..."
                  value={roleInput}
                  onChange={setRoleInput}
                  onAdd={addRole}
                  getSuggestions={getJobRoleSuggestions}
                  onApiSearch={handleRoleApiSearch}
                  disabled={isRegistered}
                />
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {targetRoles.map((role) => (
                    <Badge 
                      key={role} 
                      variant="secondary" 
                      className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 gap-1 pr-1"
                    >
                      {role}
                      {!isRegistered && (
                        <button onClick={() => removeRole(role)} className="ml-1 hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-800" />

              {/* Resume Upload */}
              <div className="space-y-3">
                <Label className="text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume / CV
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isRegistered}
                />
                <div 
                  onClick={() => !isRegistered && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isRegistered 
                      ? "border-slate-700 bg-slate-800/30" 
                      : "border-slate-700 hover:border-violet-500/50 cursor-pointer hover:bg-slate-800/50"
                  }`}
                >
                  {resumeFile || seekerData?.resumeFileName ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{resumeFile?.name || seekerData?.resumeFileName}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload your resume</p>
                      <p className="text-sm">PDF, DOC, DOCX (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button or Dashboard */}
              {!isRegistered ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-semibold py-6 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Start Auto-Applying
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-6">
                  {/* Auto-Apply Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${seekerData?.isActive ? "bg-emerald-500/20" : "bg-slate-700"}`}>
                        <Zap className={`h-5 w-5 ${seekerData?.isActive ? "text-emerald-400" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">Auto-Apply Status</p>
                        <p className="text-sm text-slate-400">
                          {seekerData?.isActive ? "Actively applying to matching jobs" : "Paused - not applying"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={seekerData?.isActive}
                      onCheckedChange={handleToggleActive}
                    />
                  </div>

                  {/* Stats */}
                  {stats && (
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs text-slate-400">Total</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{stats.applied}</p>
                        <p className="text-xs text-slate-400">Applied</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
                        <p className="text-2xl font-bold text-violet-400">{stats.interviews}</p>
                        <p className="text-xs text-slate-400">Interviews</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
                        <p className="text-2xl font-bold text-cyan-400">{stats.offers}</p>
                        <p className="text-xs text-slate-400">Offers</p>
                      </div>
                    </div>
                  )}

                  {/* Recent Applications */}
                  {applications && applications.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-400" />
                        Recent Applications
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {applications.slice(0, 5).map((app) => (
                          <div 
                            key={app.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                          >
                            <div>
                              <p className="font-medium text-white">{app.jobTitle}</p>
                              <p className="text-sm text-slate-400">{app.company}</p>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={
                                app.status === "applied" ? "border-emerald-500/50 text-emerald-400" :
                                app.status === "interview" ? "border-violet-500/50 text-violet-400" :
                                app.status === "offered" ? "border-cyan-500/50 text-cyan-400" :
                                app.status === "rejected" ? "border-red-500/50 text-red-400" :
                                "border-slate-500/50 text-slate-400"
                              }
                            >
                              {app.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit Profile Button */}
                  <Button
                    variant="outline"
                    onClick={() => setIsRegistered(false)}
                    className="w-full border-slate-700 hover:bg-slate-800 text-slate-300"
                  >
                    Edit Profile & Preferences
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Instant Applications</h3>
              <p className="text-sm text-slate-400">We apply within minutes of new job postings</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Top Companies</h3>
              <p className="text-sm text-slate-400">Access to thousands of job listings daily</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Track Everything</h3>
              <p className="text-sm text-slate-400">Monitor all your applications in one place</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
