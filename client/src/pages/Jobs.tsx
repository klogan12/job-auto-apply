import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Search, 
  MapPin, 
  Building2, 
  DollarSign, 
  Briefcase,
  Clock,
  Filter,
  X
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

export default function Jobs() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [location, setLocationFilter] = useState("");
  const [locationType, setLocationType] = useState<"remote" | "hybrid" | "onsite" | "">("");
  const [employmentType, setEmploymentType] = useState<"full-time" | "part-time" | "contract" | "internship" | "">("");
  const [experienceLevel, setExperienceLevel] = useState<"entry" | "mid" | "senior" | "lead" | "executive" | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => ({
    search: search || undefined,
    location: location || undefined,
    locationType: locationType || undefined as "remote" | "hybrid" | "onsite" | undefined,
    employmentType: employmentType || undefined as "full-time" | "part-time" | "contract" | "internship" | undefined,
    experienceLevel: experienceLevel || undefined as "entry" | "mid" | "senior" | "lead" | "executive" | undefined,
    limit: 50,
  }), [search, location, locationType, employmentType, experienceLevel]);

  const { data, isLoading } = trpc.jobs.list.useQuery(filters);

  const clearFilters = () => {
    setSearch("");
    setLocationFilter("");
    setLocationType("");
    setEmploymentType("");
    setExperienceLevel("");
  };

  const hasActiveFilters = search || location || locationType || employmentType || experienceLevel;

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Find Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Discover opportunities that match your skills
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  <Select value={locationType} onValueChange={(v) => setLocationType(v as "remote" | "hybrid" | "onsite" | "")}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Work Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as "full-time" | "part-time" | "contract" | "internship" | "")}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Job Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={experienceLevel} onValueChange={(v) => setExperienceLevel(v as "entry" | "mid" | "senior" | "lead" | "executive" | "")}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${data?.total ?? 0} jobs found`}
          </p>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg shimmer" />
                    <div className="flex-1 space-y-3">
                      <div className="w-48 h-5 shimmer rounded" />
                      <div className="w-32 h-4 shimmer rounded" />
                      <div className="flex gap-4">
                        <div className="w-24 h-4 shimmer rounded" />
                        <div className="w-24 h-4 shimmer rounded" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : data?.jobs.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            data?.jobs.map((job) => (
              <Card 
                key={job.id} 
                className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => setLocation(`/jobs/${job.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Company Logo */}
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.company} className="w-8 h-8 rounded" />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-muted-foreground">{job.company}</p>
                        </div>
                        <span className={`status-badge ${getLocationTypeBadge(job.locationType)}`}>
                          {job.locationType || "onsite"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                        )}
                        {formatSalary(job.salaryMin, job.salaryMax, job.salary) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatSalary(job.salaryMin, job.salaryMax, job.salary)}
                          </span>
                        )}
                        {job.employmentType && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {job.employmentType}
                          </span>
                        )}
                        {job.postedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(job.postedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {job.description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
