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
      <div className="flex items-center justify-around w-full p-1 md:justify-center md:gap-[18px]">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center h-auto rounded-lg text-[#BEBEBE] hover:bg-white/10 transition-all duration-300 flex-1 md:flex-none",
                isActive && "text-iris bg-white/[.08] px-2 py-1 sm:px-2.5"
              )}
            >
              <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#F2F2F2]" />
              <span className="text-xs mt-1">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;