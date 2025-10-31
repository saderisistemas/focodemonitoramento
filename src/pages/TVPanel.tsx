import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Clock, Users } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Operator = Tables<"operadores"> & { turno_12x36_tipo?: "A" | "B" | null };
type Period = Tables<"operador_periodos">;
type Config = { turno_a_trabalha_em_dias: string };

type ProcessedOperator = Operator & {
  isOnShift: boolean;
  currentFocus: string | null;
  currentPeriod: Period | null;
};

const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const TVPanel = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data } = useQuery({
    queryKey: ["tv_panel_data"],
    queryFn: async () => {
      const [operatorsRes, periodsRes, configRes] = await Promise.all([
        supabase.from("operadores").select("*").eq("ativo", true),
        supabase.from("operador_periodos").select("*"),
        supabase.from("configuracao_escala").select("*").eq("id", 1).single(),
      ]);

      if (operatorsRes.error) throw operatorsRes.error;
      if (periodsRes.error) throw periodsRes.error;
      if (configRes.error && configRes.error.code !== 'PGRST116') { // Ignore "exact one row was not found" error
        throw configRes.error;
      }

      return {
        operators: operatorsRes.data as Operator[],
        periods: periodsRes.data,
        config: configRes.data as Config | null,
      };
    },
    refetchInterval: 60000,
  });

  const onShiftOperators = useMemo(() => {
    if (!data) return [];

    const { operators, periods, config: dbConfig } = data;
    const now = currentTime;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    const config = dbConfig || { turno_a_trabalha_em_dias: 'pares' };

    const isScheduledForDate = (op: Operator, date: Date) => {
      if (!op.tipo_turno.startsWith("12x36")) return true;
      if (!op.turno_12x36_tipo) return false;

      const dayOfMonth = date.getDate();
      const isEvenDay = dayOfMonth % 2 === 0;
      const turnAWorksOnEven = config.turno_a_trabalha_em_dias.trim().toLowerCase() === 'pares';

      if (op.turno_12x36_tipo === 'A') return isEvenDay === turnAWorksOnEven;
      if (op.turno_12x36_tipo === 'B') return isEvenDay !== turnAWorksOnEven;
      return false;
    };

    return operators
      .map((op) => {
        if (!op.horário_inicio || !op.horário_fim) {
          return { ...op, isOnShift: false, currentFocus: null, currentPeriod: null };
        }

        const shiftStart = timeToMinutes(op.horário_inicio);
        const shiftEnd = timeToMinutes(op.horário_fim);

        let isOnShift = false;
        if (shiftStart > shiftEnd) { // Night shift
          if (currentTimeInMinutes >= shiftStart || currentTimeInMinutes < shiftEnd) {
            isOnShift = true;
          }
        } else { // Day shift
          if (currentTimeInMinutes >= shiftStart && currentTimeInMinutes < shiftEnd) {
            isOnShift = true;
          }
        }

        let currentFocus: string | null = null;
        let currentPeriod: Period | null = null;

        if (isOnShift) {
          const operatorPeriods = periods.filter(p => p.operador_id === op.id);
          for (const period of operatorPeriods) {
            const periodStart = timeToMinutes(period.horário_inicio);
            const periodEnd = timeToMinutes(period.horário_fim);
            
            let isInPeriod = false;
            if (periodStart > periodEnd) { // Night shift period
              if (currentTimeInMinutes >= periodStart || currentTimeInMinutes < periodEnd) {
                isInPeriod = true;
              }
            } else { // Day shift period
              if (currentTimeInMinutes >= periodStart && currentTimeInMinutes < periodEnd) {
                isInPeriod = true;
              }
            }

            if (isInPeriod) {
              currentFocus = period.foco;
              currentPeriod = period;
              break;
            }
          }
          if (!currentFocus) {
            currentFocus = "Apoio";
          }
        }
        
        return { ...op, isOnShift, currentFocus, currentPeriod };
      })
      .filter((op) => {
        if (!op.isOnShift) return false;

        const shiftStart = timeToMinutes(op.horário_inicio!);
        const shiftEnd = timeToMinutes(op.horário_fim!);
        const isNightShift = shiftStart > shiftEnd;

        if (isNightShift) {
          if (currentTimeInMinutes >= shiftStart) {
            return isScheduledForDate(op, now);
          } else {
            return isScheduledForDate(op, yesterday);
          }
        } else {
          return isScheduledForDate(op, now);
        }
      });
  }, [data, currentTime]);

  const getOperatorsByFocus = (focus: string) => {
    return onShiftOperators.filter(op => {
      if (!op.currentFocus) return false;
      
      const isEqual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

      if (isEqual(op.currentFocus, focus)) return true;
      
      if (isEqual(op.currentFocus, "Ambos") && (isEqual(focus, "IRIS") || isEqual(focus, "Situator"))) return true;
      
      return false;
    });
  };

  const getStatusIcon = () => {
    return <div className="w-4 h-4 rounded-full status-active pulse-glow" />;
  };

  const getCardClass = (focus: string | null) => {
    const normalizedFocus = (focus || "").toLowerCase();
    switch (normalizedFocus) {
      case "iris":
      case "ambos":
        return "operator-card-iris";
      case "situator":
        return "operator-card-situator";
      case "apoio":
        return "operator-card-apoio";
      default:
        return "bg-secondary";
    }
  };

  const currentLeader = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 14) return "Angélica";
    if (hour >= 14 && hour < 22) return "Alan";
    return "Santana";
  }, [currentTime]);

  const shift = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 18) return { name: "Diurno", color: "border-iris" };
    return { name: "Noturno", color: "border-situator" };
  }, [currentTime]);

  return (
    <div className="min-h-screen bg-background p-8">
      <header className={`mb-8 border-b-4 ${shift.color} pb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-2">Central Patrimonium</h1>
            <p className="text-2xl text-muted-foreground">Escala em Tempo Real</p>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-center gap-3 justify-end text-3xl font-bold">
              <Clock className="w-8 h-8" />
              {currentTime.toLocaleTimeString("pt-BR")}
            </div>
            <div className="flex items-center gap-3 justify-end text-xl text-muted-foreground">
              <Users className="w-6 h-6" />
              Líder: {currentLeader}
            </div>
            <div className="text-lg text-muted-foreground">Turno: {shift.name}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-8 mb-8">
        {(["IRIS", "Situator", "Apoio"] as const).map((focus) => (
          <div key={focus}>
            <div className="mb-6 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-${focus.toLowerCase()}`} />
              <h2 className={`text-3xl font-bold text-${focus.toLowerCase()}`}>
                {focus === "IRIS" && "🟠 IRIS"}
                {focus === "Situator" && "🔵 Situator"}
                {focus === "Apoio" && "🟢 Apoio/Supervisão"}
              </h2>
            </div>
            <div className="space-y-4">
              {getOperatorsByFocus(focus).map((operator) => (
                <div
                  key={operator.id}
                  className={`${getCardClass(operator.currentFocus)} rounded-2xl p-6 transition-all duration-300`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold">
                      {operator.nome}{" "}
                      <strong className="text-base font-normal text-muted-foreground">
                        ({operator.horário_inicio} - {operator.horário_fim})
                      </strong>
                    </h3>
                    {getStatusIcon()}
                  </div>
                  {operator.currentPeriod ? (
                    <p className="text-sm text-iris font-semibold">
                      Foco: {operator.currentPeriod.foco} ({operator.currentPeriod.horário_inicio} - {operator.currentPeriod.horário_fim})
                    </p>
                  ) : (
                     <p className="text-sm text-muted-foreground">
                        Foco: Apoio (Padrão)
                     </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="border-t border-border pt-6">
        <p className="text-center text-lg text-muted-foreground leading-relaxed max-w-4xl mx-auto">
          <strong>Central Patrimonium</strong> – Supervisão contínua. Mudanças
          fazem parte do crescimento; o objetivo é aprimorar a rotina e
          garantir equilíbrio operacional.
        </p>
      </footer>
    </div>
  );
};

export default TVPanel;