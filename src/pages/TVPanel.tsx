import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Operator = Tables<"operadores">;
type Period = Tables<"operador_periodos">;
type ManualSchedule = Tables<"escala_manual">;
type ManualPeriod = Tables<"escala_manual_periodos">;
type Config = Tables<"configuracao_escala">;

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
    queryKey: ["tv_panel_data_v2"],
    queryFn: async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const yesterdayStr = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

      const [operatorsRes, periodsRes, configRes, manualSchedulesRes, manualPeriodsRes] = await Promise.all([
        supabase.from("operadores").select("*").eq("ativo", true),
        supabase.from("operador_periodos").select("*"),
        supabase.from("configuracao_escala").select("*").eq("id", 1).single(),
        supabase.from("escala_manual").select("*, operadores(*)").in("data", [todayStr, yesterdayStr]),
        supabase.from("escala_manual_periodos").select("*"),
      ]);

      return {
        operators: (operatorsRes.data || []) as Operator[],
        periods: (periodsRes.data || []) as Period[],
        config: configRes.data as Config | null,
        manualSchedules: (manualSchedulesRes.data || []) as ManualSchedule[],
        manualPeriods: (manualPeriodsRes.data || []) as ManualPeriod[],
      };
    },
    refetchInterval: 60000,
  });

  const onShiftOperators = useMemo(() => {
    if (!data) return [];
    const { operators, periods, config, manualSchedules, manualPeriods } = data;
    const now = currentTime;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();
    const dayMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const currentDayAbbr = dayMap[dayOfWeek];
    const dbConfig = config || { turno_a_trabalha_em_dias: 'pares' };

    const processedOperatorIds = new Set<string>();
    const finalOnShiftList = [];

    // 1. Process manual schedules first
    for (const op of operators) {
      const todayManual = manualSchedules.find(s => s.operador_id === op.id && s.data === format(now, "yyyy-MM-dd"));
      const yesterdayManual = manualSchedules.find(s => s.operador_id === op.id && s.data === format(yesterday, "yyyy-MM-dd"));
      
      let activeManualShift = null;
      if (todayManual) {
        const start = timeToMinutes(todayManual.horario_inicio);
        const end = timeToMinutes(todayManual.horario_fim);
        if (start <= end && currentTimeInMinutes >= start && currentTimeInMinutes < end) activeManualShift = todayManual;
        if (start > end && currentTimeInMinutes >= start) activeManualShift = todayManual;
      }
      if (!activeManualShift && yesterdayManual) {
        const start = timeToMinutes(yesterdayManual.horario_inicio);
        const end = timeToMinutes(yesterdayManual.horario_fim);
        if (start > end && currentTimeInMinutes < end) activeManualShift = yesterdayManual;
      }

      if (activeManualShift) {
        processedOperatorIds.add(op.id);
        let currentFocus = activeManualShift.foco || "Apoio";
        let currentObservation = activeManualShift.observacao || null;
        const relevantPeriods = manualPeriods.filter(p => p.escala_manual_id === activeManualShift!.id);
        
        for (const period of relevantPeriods) {
          const pStart = timeToMinutes(period.horario_inicio);
          const pEnd = timeToMinutes(period.horario_fim);
          if (currentTimeInMinutes >= pStart && currentTimeInMinutes < pEnd) {
            currentFocus = period.foco;
            currentObservation = period.observacao || null;
            break;
          }
        }
        finalOnShiftList.push({ ...op, isOnShift: true, currentFocus, currentObservation, displayStartTime: activeManualShift.horario_inicio, displayEndTime: activeManualShift.horario_fim });
      }
    }

    // 2. Process automatic schedules for remaining operators
    const isScheduledFor12x36 = (op: Operator, date: Date) => {
      if (!op.turno_12x36_tipo) return false;
      const dayOfMonth = date.getDate();
      const isEvenDay = dayOfMonth % 2 === 0;
      const turnAWorksOnEven = dbConfig.turno_a_trabalha_em_dias.trim().toLowerCase() === 'pares';
      if (op.turno_12x36_tipo === 'A') return isEvenDay === turnAWorksOnEven;
      if (op.turno_12x36_tipo === 'B') return isEvenDay !== turnAWorksOnEven;
      return false;
    };

    for (const op of operators) {
      if (processedOperatorIds.has(op.id)) continue;

      let isOnShift = false;
      let shiftStart = 0, shiftEnd = 0;
      let displayStartTime = op.horário_inicio, displayEndTime = op.horário_fim;
      const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;

      if (op.tipo_turno === '6x18') {
        let relevantStart = null, relevantEnd = null;
        if (dayOfWeek === 6 && op.horario_inicio_sabado && op.horario_fim_sabado) {
          [relevantStart, relevantEnd] = [op.horario_inicio_sabado, op.horario_fim_sabado];
        } else if (dayOfWeek === 0 && op.horario_inicio_domingo && op.horario_fim_domingo) {
          [relevantStart, relevantEnd] = [op.horario_inicio_domingo, op.horario_fim_domingo];
        } else if (isWeekday && op.dias_semana?.includes(currentDayAbbr)) {
          [relevantStart, relevantEnd] = [op.horário_inicio, op.horário_fim];
        }
        if (relevantStart && relevantEnd) {
          shiftStart = timeToMinutes(relevantStart);
          shiftEnd = timeToMinutes(relevantEnd);
          displayStartTime = relevantStart;
          displayEndTime = relevantEnd;
          isOnShift = (shiftStart > shiftEnd)
            ? (currentTimeInMinutes >= shiftStart || currentTimeInMinutes < shiftEnd)
            : (currentTimeInMinutes >= shiftStart && currentTimeInMinutes < shiftEnd);
        }
      } 
      else if (isWeekday && op.tipo_turno.startsWith('12x36') && op.horário_inicio && op.horário_fim) {
        shiftStart = timeToMinutes(op.horário_inicio);
        shiftEnd = timeToMinutes(op.horário_fim);
        const isWithinTime = (shiftStart > shiftEnd)
          ? (currentTimeInMinutes >= shiftStart || currentTimeInMinutes < shiftEnd)
          : (currentTimeInMinutes >= shiftStart && currentTimeInMinutes < shiftEnd);
        if (isWithinTime) {
          const dateToCheck = (shiftStart > shiftEnd && currentTimeInMinutes < shiftEnd) ? yesterday : now;
          isOnShift = isScheduledFor12x36(op, dateToCheck);
        }
      }

      if (isOnShift) {
        let currentFocus = "Apoio";
        let currentObservation = null;
        const operatorPeriods = periods.filter(p => p.operador_id === op.id);
        for (const period of operatorPeriods) {
          const pStart = timeToMinutes(period.horário_inicio);
          const pEnd = timeToMinutes(period.horário_fim);
          if ((pStart > pEnd) ? (currentTimeInMinutes >= pStart || currentTimeInMinutes < pEnd) : (currentTimeInMinutes >= pStart && currentTimeInMinutes < pEnd)) {
            currentFocus = period.foco;
            currentObservation = period.observação || null;
            break;
          }
        }
        finalOnShiftList.push({ ...op, isOnShift: true, currentFocus, currentObservation, displayStartTime, displayEndTime });
      }
    }
    return finalOnShiftList;
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
    if (!data || !data.config) return "Carregando...";

    const { config } = data;
    const hour = currentTime.getHours();

    // Night shift (19:00 - 06:59)
    if (hour >= 19 || hour < 7) {
      return config.lider_noturno_nome || "Líder Noturno";
    }

    // Day shift (07:00 - 18:59)
    const dayOfMonth = currentTime.getDate();
    const isEvenDay = dayOfMonth % 2 === 0;
    const turnAWorksOnEven = config.turno_a_trabalha_em_dias.trim().toLowerCase() === 'pares';
    
    const isTurnAOnDuty = isEvenDay === turnAWorksOnEven;

    return isTurnAOnDuty 
        ? (config.lider_diurno_a_nome || "Líder Turno A") 
        : (config.lider_diurno_b_nome || "Líder Turno B");
  }, [currentTime, data]);

  return (
    <div className="min-h-screen flex flex-col p-6 pb-24 font-sans">
      <header className="w-full">
        <div className="flex justify-between items-center">
          <img src="/logo.png" alt="Patrimonium Logo" className="h-20" />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-wider">
              Foco de Monitoramento - REAL TIME
            </h1>
          </div>
          <div className="text-right">
            <div className="font-mono text-5xl font-medium text-[#F6F6F6] mb-2">
              {currentTime.toLocaleTimeString("pt-BR")}
            </div>
            <div className="flex items-center justify-end gap-2 text-xl">
              <Users size={22} className="text-[#8FC1FF]" />
              <span className="text-[#C9DEFF] font-semibold">{currentLeader}</span>
              <span className="text-[#A0A0A0]">
                ({currentTime.getHours() >= 7 && currentTime.getHours() < 19 ? "Diurno" : "Noturno"})
              </span>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-iris mt-4 mb-4" />
      </header>

      <main className="flex-grow grid grid-cols-[35fr_1px_30fr_1px_35fr] gap-6">
        {/* IRIS Column */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-4"><span className="text-iris">🟠</span> IRIS</h2>
          <div className="w-full space-y-3.5">
            {getOperatorsByFocus("IRIS").map((operator, index) => (
              <div 
                key={operator.id} 
                className="relative group gradient-iris border border-white/[.07] rounded-4xl px-5 py-4 shadow-[0_3px_10px_rgba(0,0,0,0.4)] transition-all duration-300 ease-in-out hover:scale-103 hover:shadow-[0_0_12px_rgba(255,255,255,0.10)] animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="status-indicator status-active pulse-glow" />
                <h3 className="text-[1.45rem] font-semibold text-white">{operator.nome}</h3>
                <p className="text-[1.05rem] text-[#E4E6EB]" style={{ letterSpacing: '0.5px' }}>{operator.displayStartTime} - {operator.displayEndTime}</p>
                {operator.currentObservation && (
                  <p className="text-sm text-white/80 mt-1 italic truncate" title={operator.currentObservation}>
                    {operator.currentObservation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="w-full h-full bg-border" />
        {/* Situator Column */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-4"><span className="text-situator">🔵</span> Situator</h2>
          <div className="w-full space-y-3.5">
            {getOperatorsByFocus("Situator").map((operator, index) => (
              <div 
                key={operator.id} 
                className="relative group gradient-situator border border-white/[.07] rounded-4xl px-5 py-4 shadow-[0_3px_10px_rgba(0,0,0,0.4)] transition-all duration-300 ease-in-out hover:scale-103 hover:shadow-[0_0_12px_rgba(255,255,255,0.10)] animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="status-indicator status-active pulse-glow" />
                <h3 className="text-[1.45rem] font-semibold text-white">{operator.nome}</h3>
                <p className="text-[1.05rem] text-[#E4E6EB]" style={{ letterSpacing: '0.5px' }}>{operator.displayStartTime} - {operator.displayEndTime}</p>
                {operator.currentObservation && (
                  <p className="text-sm text-white/80 mt-1 italic truncate" title={operator.currentObservation}>
                    {operator.currentObservation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="w-full h-full bg-border" />
        {/* Apoio Column */}
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-4"><span className="text-apoio">🟢</span> Apoio/Supervisão</h2>
          <div className="w-full space-y-3.5">
            {getOperatorsByFocus("Apoio").map((operator, index) => (
              <div 
                key={operator.id} 
                className="relative group gradient-apoio border border-white/[.07] rounded-4xl px-5 py-4 shadow-[0_3px_10px_rgba(0,0,0,0.4)] transition-all duration-300 ease-in-out hover:scale-103 hover:shadow-[0_0_12px_rgba(255,255,255,0.10)] animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="status-indicator status-active pulse-glow" />
                <h3 className="text-[1.45rem] font-semibold text-white">{operator.nome}</h3>
                <p className="text-[1.05rem] text-[#E4E6EB]" style={{ letterSpacing: '0.5px' }}>{operator.displayStartTime} - {operator.displayEndTime}</p>
                {operator.currentObservation && (
                  <p className="text-sm text-white/80 mt-1 italic truncate" title={operator.currentObservation}>
                    {operator.currentObservation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center italic text-[0.9rem] text-[#9C9C9C] py-3 border-t border-white/[.05] mt-auto">
        <p>🕊️ Central Patrimonium – Supervisão contínua para um ambiente seguro e equilibrado.</p>
      </footer>
    </div>
  );
};

export default TVPanel;