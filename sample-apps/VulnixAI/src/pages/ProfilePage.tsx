import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Building2, 
  LogIn, 
  Activity,
  Hash,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navigation } from "@/components/Navigation";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate("/login");
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name?: string, username?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return username?.slice(0, 2).toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Profile Header */}
          <Card className="bg-card border-border mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-24 h-24 border-2 border-primary/20">
                  <AvatarImage src={user.avatarUrl} alt={user.name || user.username} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {getInitials(user.name, user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-medium text-foreground mb-1">
                        {user.name || user.username}
                      </h1>
                      <p className="text-muted-foreground text-sm mb-3">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-foreground text-sm mb-4 max-w-2xl">
                          {user.bio}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {user.company && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            <span>{user.company}</span>
                          </div>
                        )}
                        {user.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span>{user.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Information */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Hash className="w-3 h-3" />
                    User ID
                  </div>
                  <p className="text-sm text-foreground font-mono">{user.userId}</p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </div>
                  <p className="text-sm text-foreground">{user.email}</p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <User className="w-3 h-3" />
                    Username
                  </div>
                  <p className="text-sm text-foreground font-mono">@{user.username}</p>
                </div>
              </CardContent>
            </Card>

            {/* Activity Statistics */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Activity Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <LogIn className="w-3 h-3" />
                    Total Logins
                  </div>
                  <p className="text-2xl font-medium text-foreground">
                    {user.loginCount || 0}
                  </p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    First Login
                  </div>
                  <p className="text-sm text-foreground">
                    {formatDate(user.firstLogin)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Session Information */}
            <Card className="bg-card border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Session Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <LogIn className="w-3 h-3" />
                      Last Login
                    </div>
                    <p className="text-sm text-foreground">
                      {formatDate(user.lastLogin)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Activity className="w-3 h-3" />
                      Last Active
                    </div>
                    <p className="text-sm text-foreground">
                      {formatDate(user.lastActive)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GitHub Link */}
          <div className="mt-6 text-center">
            <a
              href={`https://github.com/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
            >
              View GitHub Profile
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
