import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Lock, Unlock, Star, ArrowRight, GitBranch, AlertCircle, Key } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { API_ENDPOINTS } from "@/config/api";
import { AuthService } from "@/services/auth.service";
import { ScanService } from "@/services/scan.service";

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  url: string;
  defaultBranch: string;
}

interface Branch {
  name: string;
  protected: boolean;
}

const RepoSelectPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState<string>("");

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = AuthService.getToken();
      if (!token) {
        setError("Not authenticated. Please log in again.");
        return;
      }

      const response = await fetch(API_ENDPOINTS.auth.repositories, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          const msg = errorData.error || "";
          if (msg.includes("GitHub access token")) {
            setError("GitHub access token missing. Please log out and log in again to re-authorize.");
          } else {
            setError("Session expired. Please log in again.");
            setTimeout(() => navigate("/login"), 2000);
          }
          return;
        }
        throw new Error(errorData.error || "Failed to fetch repositories");
      }

      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (err) {
      console.error("Error fetching repositories:", err);
      setError("Failed to load repositories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (repoFullName: string) => {
    try {
      setLoadingBranches(true);
      const token = AuthService.getToken();
      if (!token) return;

      const [owner, repo] = repoFullName.split('/');
      const response = await fetch(API_ENDPOINTS.auth.branches(owner, repo), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }

      const data = await response.json();
      setBranches(data.branches || []);
      
      // Set default branch as selected
      const selectedRepo = repositories.find(r => r.fullName === repoFullName);
      if (selectedRepo) {
        setSelectedBranch(selectedRepo.defaultBranch);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const filtered = repositories.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleScan = async () => {
    if (!selected || !selectedBranch) return;
    
    const selectedRepo = repositories.find(r => r.id === selected);
    if (!selectedRepo) return;

    try {
      // Note: aiApiKey is collected but not sent to backend - backend uses .env key
      const { scanId } = await ScanService.startScan({
        repoId: selectedRepo.id,
        repoName: selectedRepo.name,
        repoFullName: selectedRepo.fullName,
        repoUrl: selectedRepo.url,
        defaultBranch: selectedBranch, // Use selected branch instead of default
      });

      navigate(`/scan?scanId=${scanId}`);
    } catch (error: any) {
      console.error("Error starting scan:", error);
      setError(error.message || "Failed to start scan");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="w-full px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-medium text-foreground mb-2">Security Scan</h1>
          <p className="text-muted-foreground mb-8 font-light">Scan a repository for vulnerabilities</p>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="w-full pl-11 pr-4 py-2.5 rounded-md bg-card border-2 border-primary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-[0_0_10px_rgba(34,197,94,0.3)] focus:shadow-[0_0_20px_rgba(34,197,94,0.5)] font-mono text-sm transition-all"
            />
          </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-muted-foreground text-sm">Loading repositories...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">{error}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={fetchRepositories}
                      className="text-sm text-primary hover:underline"
                    >
                      Try again
                    </button>
                    {error.includes("log out") || error.includes("re-authorize") ? (
                      <button
                        onClick={async () => { await AuthService.logout(); navigate("/login"); }}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        Log out &amp; re-authenticate
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && repositories.length === 0 && (
                <div className="text-center py-12">
                  <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No repositories found</p>
                  <p className="text-muted-foreground text-xs mt-2">
                    Make sure you've granted repository access during login
                  </p>
                </div>
              )}

              {/* Repo Cards Grid */}
              {!loading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {filtered.map((repo, i) => (
                    <motion.div
                      key={repo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-lg border transition-all cursor-pointer ${
                        selected === repo.id
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelected(repo.id);
                        fetchBranches(repo.fullName);
                      }}
                    >
                      <div className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {repo.isPrivate ? (
                              <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Unlock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <h3 className="font-medium text-foreground text-sm line-clamp-1">
                              {repo.name}
                            </h3>
                          </div>
                          {selected === repo.id && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-black" />
                            </div>
                          )}
                        </div>

                        {/* Full Name */}
                        <p className="text-xs text-muted-foreground font-mono line-clamp-1">
                          {repo.fullName}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-light pt-2 border-t border-border">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            <span className="truncate">{repo.language}</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Star className="w-3 h-3" /> {repo.stars}
                          </span>
                        </div>

                        {/* Branch Selection */}
                        {selected === repo.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-2"
                          >
                            <label className="text-xs text-muted-foreground">Select Branch:</label>
                            {loadingBranches ? (
                              <div className="flex items-center justify-center py-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : (
                              <select
                                value={selectedBranch}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedBranch(e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                              >
                                {branches.map((branch) => (
                                  <option key={branch.name} value={branch.name}>
                                    {branch.name} {branch.protected ? '🔒' : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </motion.div>
                        )}

                        {/* AI API Key Input */}
                        {selected === repo.id && selectedBranch && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-2"
                          >
                            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Key className="w-3 h-3" />
                              AI API Key (Optional):
                            </label>
                            <input
                              type="password"
                              value={aiApiKey}
                              onChange={(e) => {
                                e.stopPropagation();
                                setAiApiKey(e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Leave empty to use default"
                              className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                            />
                            <p className="text-[10px] text-muted-foreground/70">
                              If not provided, the default API key will be used
                            </p>
                          </motion.div>
                        )}

                        {/* Scan Button */}
                        {selected === repo.id && selectedBranch && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScan();
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-black text-sm hover:opacity-90 transition-opacity"
                          >
                            Start Scan
                            <ArrowRight className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* No Search Results */}
              {!loading && !error && repositories.length > 0 && filtered.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">No repositories match your search</p>
                </div>
              )}
        </motion.div>
      </div>
    </div>
  );
};

export default RepoSelectPage;
