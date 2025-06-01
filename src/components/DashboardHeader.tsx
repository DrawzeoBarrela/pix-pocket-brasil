
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { DarkModeToggle } from './DarkModeToggle';

const DashboardHeader = () => {
  const { user, signOut, isAdmin } = useAuth();

  return (
    <div className="flex justify-between items-center mb-8 bg-card border rounded-lg shadow-md p-4">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo, {user?.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <DarkModeToggle />
        {isAdmin && (
          <Link to="/admin">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings size={16} />
              Painel Admin
            </Button>
          </Link>
        )}
        <Button 
          onClick={signOut} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut size={16} />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
