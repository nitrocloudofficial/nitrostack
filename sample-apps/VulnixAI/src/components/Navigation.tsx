import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "./UserProfile";
import logo from "/image.png";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border/50 px-6 py-4 backdrop-blur-sm bg-black/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="VulnixAI logo" className="h-8 w-auto" />
            <span
                className="font-medium text-sm"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#00ff41',
                  textShadow: '0 0 8px #00ff41, 1px 1px 0px #003300',
                }}
              >
                VulnixAI
              </span>
          </button>
          {isAuthenticated && (
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate("/repos")}
                className={`text-sm transition-colors ${
                  isActive("/repos")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Scan
              </button>
              <button
                onClick={() => navigate("/monitoring")}
                className={`text-sm transition-colors ${
                  isActive("/monitoring")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monitoring
              </button>
              <button
                onClick={() => navigate("/website-scan")}
                className={`text-sm transition-colors ${
                  isActive("/website-scan")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Website Scan
              </button>
              <button
                onClick={() => navigate("/pentest")}
                className={`text-sm transition-colors ${
                  isActive("/pentest")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pentest
              </button>
              <button
                onClick={() => navigate("/loadtest")}
                className={`text-sm transition-colors ${
                  isActive("/loadtest")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Load Test
              </button>
              <button
                onClick={() => navigate("/sandbox")}
                className={`text-sm transition-colors ${
                  isActive("/sandbox")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sandbox
              </button>
              <button
                onClick={() => navigate("/domain-verification")}
                className={`text-sm transition-colors ${
                  isActive("/domain-verification")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Domains
              </button>
              <button
                onClick={() => navigate("/scan-history")}
                className={`text-sm transition-colors ${
                  isActive("/scan-history")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                History
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <UserProfile />
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
