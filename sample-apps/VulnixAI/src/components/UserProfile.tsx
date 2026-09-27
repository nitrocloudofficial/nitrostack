import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Settings, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export const UserProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const getInitials = (name?: string, username?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return username?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarImage src={user.avatarUrl} alt={user.name || user.username} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(user.name, user.username)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-foreground hidden md:inline">
            {user.name || user.username}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-foreground">
              {user.name || user.username}
            </p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => navigate('/profile')}
          className="cursor-pointer text-foreground hover:bg-accent focus:bg-accent"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/monitoring')}
          className="cursor-pointer text-foreground hover:bg-accent focus:bg-accent"
        >
          <Activity className="mr-2 h-4 w-4" />
          <span>Activity</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-500 hover:bg-accent focus:bg-accent focus:text-red-500"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
