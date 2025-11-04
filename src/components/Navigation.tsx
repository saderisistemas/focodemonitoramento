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
    <nav className="fixed bottom-0 left-0 right-0 bg-[#18191C] border-t border-white/[.08] z-50">
      <div className="flex items-center justify-center gap-[18px] p-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center h-auto rounded-lg text-[#BEBEBE] hover:bg-white/10 transition-all duration-300",
                isActive && "text-iris bg-white/[.08] px-2.5 py-1"
              )}
            >
              <item.icon className="w-6 h-6 text-[#F2F2F2]" />
              <span className="text-[1.05rem] mt-1">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;