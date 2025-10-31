import { Button } from "@/components/ui/button";
import { Home, Calendar, Activity, Users, CalendarDays } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-6 py-3 shadow-lg z-50">
      <div className="flex items-center gap-2">
        <Button
          variant={isActive("/tv-panel") ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate("/tv-panel")}
          className="rounded-full"
        >
          <Home className="w-4 h-4 mr-2" />
          Painel TV
        </Button>
        <Button
          variant={isActive("/manual-schedule") ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate("/manual-schedule")}
          className="rounded-full"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Escala Manual
        </Button>
        <Button
          variant={isActive("/weekend-schedule") ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate("/weekend-schedule")}
          className="rounded-full"
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Fim de Semana
        </Button>
        <Button
          variant={isActive("/status") ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate("/status")}
          className="rounded-full"
        >
          <Activity className="w-4 h-4 mr-2" />
          Status
        </Button>
        <Button
          variant={isActive("/operator-management") ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate("/operator-management")}
          className="rounded-full"
        >
          <Users className="w-4 h-4 mr-2" />
          Operadores
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;