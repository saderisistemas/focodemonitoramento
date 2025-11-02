import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Bird } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Operator = Tables<"operadores"> & { turno_12x36_tipo?: "A" | "B" | null };
type Period = Tables<"operador_periodos">;
type Config = { turno_a_trabalha_em_dias: string };

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
      if (configRes.error && configRes.error.code !== 'PGRST116') {
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
        let isOnShift = (shiftStart > shiftEnd)
          ? (currentTimeInMinutes >= shiftStart || currentTimeInMinutes < shiftEnd)
          : (currentTimeInMinutes >= shiftStart && currentTimeInMinutes < shiftEnd);

        let currentFocus: string | null = null;
        let currentPeriod: Period | null = null;

        if (isOnShift) {
          const operatorPeriods = periods.filter(p => p.operador_id === op.id);
          for (const period of operatorPeriods) {
            const periodStart = timeToMinutes(period.horário_inicio);
            const periodEnd = timeToMinutes(period.horário_fim);
            let isInPeriod = (periodStart > periodEnd)
              ? (currentTimeInMinutes >= periodStart || currentTimeInMinutes < periodEnd)
              : (currentTimeInMinutes >= periodStart && currentTimeInMinutes < periodEnd);
            if (isInPeriod) {
              currentFocus = period.foco;
              currentPeriod = period;
              break;
            }
          }
          if (!currentFocus) currentFocus = "Apoio";
        }
        return { ...op, isOnShift, currentFocus, currentPeriod };
      })
      .filter((op) => {
        if (!op.isOnShift) return false;
        const shiftStart = timeToMinutes(op.horário_inicio!);
        const isNightShift = shiftStart > timeToMinutes(op.horário_fim!);
        if (isNightShift) {
          return (currentTimeInMinutes >= shiftStart) ? isScheduledForDate(op, now) : isScheduledForDate(op, yesterday);
        }
        return isScheduledForDate(op, now);
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

  const currentLeader = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 14) return "Angélica";
    if (hour >= 14 && hour < 22) return "Alan";
    return "Santana";
  }, [currentTime]);

  return (
    <div className="min-h-screen flex flex-col p-5 font-sans">
      <header className="w-full">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[2.8rem] font-semibold tracking-[2px]">Central Patrimonium</h1>
            <p className="text-[1.1rem] text-[#A0A0A0]">Escala em Tempo Real</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[1.3rem] text-[#E6E6E6] mb-2">
              {currentTime.toLocaleTimeString("pt-BR")}
            </div>
            <div className="flex items-center justify-end gap-2 text-[0.9rem]">
              <Users size={18} className="text-[#8FC1FF]" />
              <span className="text-[#C9DEFF]">{currentLeader}</span>
              <span className="text-[#9C9C9C]">
                ({currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? "Diurno" : "Noturno"})
              </span>
            </div>
          </div>
        </div>
        <div className="h-[3px] bg-iris my-2 mb-5" />
      </header>

      <main className="flex-grow grid grid-cols-[35fr_1px_30fr_1px_35fr] gap-5">
        {/* IRIS Column */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-iris mb-4">🟠 IRIS</h2>
          <div className="w-full space-y-3">
            {getOperatorsByFocus("IRIS").map((operator) => (
              <div key={operator.id} className="relative gradient-iris border border-iris rounded-4xl p-4 shadow-lg transition-all duration-250 ease-in-out hover:scale-103 hover:shadow-white/10">
                <div className="status-indicator status-active pulse-glow" />
                <h3 className="text-[1.4rem] font-semibold text-white">{operator.nome}</h3>
                <p className="text-[1.0rem] text-[#BEBEBE]">{operator.horário_inicio} - {operator.horário_fim}</p>
                <p className="text-[0.95rem] font-semibold text-white mt-1">
                  Foco: {operator.currentPeriod?.foco || "Apoio"}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full h-full bg-border" />
        {/* Situator Column */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-situator mb-4">🔵 Situator</h2>
          <div className="w-full space-y-3">
            {getOperatorsByFocus("Situator").map((operator) => (
              <div key={operator.id} className="relative gradient-situator border border-situator rounded-4xl p-4 shadow-lg transition-all duration-250 ease-in-out hover:scale-103 hover:shadow-white/10">
                <div className="status-indicator status-active pulse-glow" />
                <h3 className="text-[1.4rem] font-semibold text-white">{operator.nome}</h3>
                <p className="text-[1.0rem] text-[#BEBEBE]">{operator.horário_inicio} - {operator.horário_fim}</p>
                <p className="text-[0.95rem] font-semibold text-white mt-1">
                  Foco: {operator.currentPeriod?.foco || "Apoio"}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full h-full bg-border" />
        {/* Apoio Column */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-apoio mb-4">🟢 Apoio/Supervisão</h2>
          <div className="w-full space-y-3">
            {getOperatorsByFocus("Apoio").map((operator) => (
              <div key={operator.id} className="relative gradient-apoio border border-apoio rounded-4xl p-4 shadow-lg transition-all duration-250 ease-in-out hover:scale-103 hover:shadow-white/10">
                <div className="status-indicator status-active pulse-glow" />
                <h3 className="text-[1.4rem] font-semibold text-white">{operator.nome}</h3>
                <p className="text-[1.0rem] text-[#BEBEBE]">{operator.horário_inicio} - {operator.horário_fim}</p>
                <p className="text-[0.95rem] font-semibold text-white mt-1">
                  Foco: {operator.currentPeriod?.foco || "Apoio"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center italic text-[0.9rem] text-[#9E9E9E] py-2.5">
        <p><Bird className="inline-block mr-2" size={16} />Central Patrimonium – Supervisão contínua para um ambiente seguro e equilibrado.</p>
      </footer>
    </div>
  );
};

export default TVPanel;