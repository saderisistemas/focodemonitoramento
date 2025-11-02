import { Button } from "@/components/ui/button";
import { Home, Users, CalendarDays, Cog } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/tv-panel", label: "Painel TV", icon: Home },
    { path: "/weekend-schedule", label: "Fim de Semana", icon: CalendarDays },
    { path: "/operator-management", label: "Operadores", icon: Users },
    { path: "/scale-config", label: "Configurações", icon: Cog },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-white/10 z-50">
      <div className="flex items-center justify-center gap-4 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center h-auto p-2 rounded-md text-[#D0D0D0] hover:bg-white/10 text-base",
                isActive && "text-iris"
              )}
            >
              <item.icon className="w-6 h-6 text-[#EAEAEA]" />
              <span className="text-xs mt-1">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;