import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Operator = Tables<"operadores">;
type Period = Tables<"operador_periodos">;
type ManualSchedule = {
  id: string;
  operador_id: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  foco?: string;
  observacao?: string;
};

type ManualPeriod = {
  id: string;
  escala_manual_id: string;
  horario_inicio: string;
  horario_fim: string;
  foco: string;
  observacao?: string;
};
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
        supabase.from("configuracao_escala").select("turno_a_trabalha_em_dias, lider_diurno_a_nome, lider_diurno_b_nome, lider_noturno_nome, lider_noturno_a_nome, lider_noturno_b_nome, nome_gestor").eq("id", 1).single(),
        supabase.from("escala_manual").select("*, operadores(*)").in("data", [todayStr, yesterdayStr]),
        supabase.from("escala_manual_periodos").select("*")
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
    const dbConfig = config as any || { turno_a_trabalha_em_dias: 'pares' }; // Cast to any internally if union types conflict

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
      else if (op.tipo_turno.startsWith('12x36') && op.horário_inicio && op.horário_fim) {
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

    const config = data.config as any; // Typecast any due to partial intersection
    const hour = currentTime.getHours();

    const turnAWorksOnEven = config.turno_a_trabalha_em_dias?.trim().toLowerCase() === 'pares';


    // Se estivermos entre 00:00 e 06:59, o dia de referência do turno noturno é o dia ANTERIOR
    let referenceDate = new Date(currentTime);
    if (hour < 7) {
      referenceDate.setDate(referenceDate.getDate() - 1);
    }
    const dayOfMonth = referenceDate.getDate();
    const isEvenDay = dayOfMonth % 2 === 0;

    const isTurnAOnDuty = isEvenDay === turnAWorksOnEven;

    // Night shift (19:00 - 06:59)
    if (hour >= 19 || hour < 7) {
      return isTurnAOnDuty
        ? (config.lider_noturno_a_nome || "Líder Noturno A")
        : (config.lider_noturno_b_nome || "Líder Noturno B");
    }

    // Day shift (07:00 - 18:59)
    return isTurnAOnDuty
      ? (config.lider_diurno_a_nome || "Líder Turno A")
      : (config.lider_diurno_b_nome || "Líder Turno B");
  }, [currentTime, data]);


  const formatTimeForDisplay = (timeStr: string | null | undefined): string => {
    if (!timeStr) return "";
    return timeStr.substring(0, 5);
  };

  const renderOperatorCard = (operator: any, index: number, type: 'iris' | 'situator' | 'apoio') => {
    const cardThemes = {
      iris: { dot: "bg-orange-500", text: "text-orange-500", glow: "shadow-[0_0_8px_rgba(249,115,22,0.4)]", bgGlow: "bg-orange-500/10", border: "border-orange-500/20" },
      situator: { dot: "bg-blue-500", text: "text-blue-500", glow: "shadow-[0_0_8px_rgba(59,130,246,0.4)]", bgGlow: "bg-blue-500/10", border: "border-blue-500/20" },
      apoio: { dot: "bg-emerald-500", text: "text-emerald-500", glow: "shadow-[0_0_8px_rgba(16,185,129,0.4)]", bgGlow: "bg-emerald-500/10", border: "border-emerald-500/20" }
    };
    const theme = cardThemes[type];

    return (
      <div
        key={operator.id}
        className={`relative bg-[#0d0d12]/80 backdrop-blur-md rounded-xl border border-white/5 p-4 md:p-5 w-full flex flex-col min-h-[110px] shadow-lg overflow-hidden`}
      >
        <div className={`absolute top-0 left-0 w-full h-1 ${theme.bgGlow} -z-10`}></div>
        <div className="flex justify-between items-center mb-3 md:mb-4 z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-bold text-white tracking-tight">{operator.nome}</h3>
          </div>
          <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${theme.dot} ${theme.glow} animate-pulse`} />
        </div>

        <div className="flex items-center gap-2 text-zinc-300 font-mono text-xs md:text-sm font-medium mb-3 md:mb-4 bg-black/40 px-2.5 py-1 md:px-3 md:py-1.5 rounded-md w-max border border-white/5 z-10 shadow-inner">
          <span>{formatTimeForDisplay(operator.displayStartTime)}</span>
          <span className="text-zinc-600">—</span>
          <span>{formatTimeForDisplay(operator.displayEndTime)}</span>
        </div>

        {operator.currentObservation ? (
          <div className="text-xs md:text-[0.85rem] font-medium text-zinc-400 leading-relaxed mt-auto pt-3 border-t border-white/5 z-10 italic w-full">
            "{operator.currentObservation}"
          </div>
        ) : <div className="mt-auto z-10"></div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 overflow-hidden flex flex-col p-4 md:p-6 font-sans selection:bg-blue-500/30">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#050508] to-[#050508]"></div>

      {/* Header */}
      <header className="relative z-10 w-full flex-shrink-0 flex flex-col xl:flex-row justify-between items-center gap-4 md:gap-6 pb-4 md:pb-6 mb-6 md:mb-8 border-b border-zinc-800/80">

        {/* Left: Logo */}
        <div className="flex items-center gap-4 md:gap-5 xl:w-[30%] justify-start shrink-0">
          <img src="/logo.png" alt="Foco de Monitoramento Logo" className="h-12 md:h-16 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          <div className="flex flex-col justify-center">
            <h1 className="text-xl md:text-3xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-md">
              Foco de Monitoramento
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[0.65rem] md:text-xs text-emerald-400 font-semibold tracking-widest uppercase">
                Ao Vivo
              </p>
            </div>
          </div>
        </div>

        {/* Center: Gestor da Central discreetly displayed */}
        <div className="xl:w-[40%] flex justify-center w-full">
          {data?.config && (data.config as any).nome_gestor ? (
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.05] overflow-hidden relative">
              <p className="text-zinc-500 text-[0.6rem] md:text-[0.7rem] font-semibold uppercase tracking-[0.1em] flex items-center gap-1.5 relative z-10">
                <Users className="w-3 h-3 text-zinc-500" /> Gestor:
              </p>
              <p className="text-zinc-300 font-medium text-xs md:text-sm tracking-wide relative z-10">{(data.config as any).nome_gestor}</p>
            </div>
          ) : null}
        </div>

        {/* Right: Time & Shift Leader */}
        <div className="xl:w-[30%] flex flex-col items-center xl:items-end justify-end space-y-2 md:space-y-3 shrink-0">
          <div className="font-mono text-4xl md:text-5xl font-bold text-white tabular-nums tracking-tighter leading-none shrink-0 drop-shadow-md">
            {currentTime.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="flex items-center gap-2 md:gap-4 text-sm md:text-base text-zinc-200 bg-[#11111A]/90 border border-white/10 px-4 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl shadow-lg backdrop-blur-md shrink-0">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-zinc-400 font-medium">Líder:</span>
              <span className="text-white font-bold tracking-tight text-base md:text-xl">{currentLeader}</span>
            </div>
            <span className="w-px h-4 md:h-5 bg-white/10 mx-1"></span>
            <span className="text-zinc-300 font-bold text-[0.65rem] md:text-xs uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-1 rounded">
              {currentTime.getHours() >= 7 && currentTime.getHours() < 19 ? "Diurno" : "Noturno"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Columns */}
      <main className="relative z-10 flex-grow grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 min-h-0 pb-4 md:pb-6">

        {/* IRIS Column */}
        <div className="flex flex-col h-full bg-[#11111A]/60 border border-white/5 rounded-2xl md:rounded-[1.5rem] p-4 md:p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-5 pb-3 md:pb-4 border-b border-white/5">
            <div className="p-1.5 md:p-2 bg-orange-500/10 rounded-lg md:rounded-xl border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)] flex-shrink-0">
              <span className="text-orange-400 text-sm md:text-lg font-bold">🟠</span>
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">IRIS</h2>
          </div>
          <div className="space-y-3 flex-grow flex flex-col overflow-y-auto pr-1.5 md:pr-2 custom-scrollbar">
            {getOperatorsByFocus("IRIS").map((op, i) => renderOperatorCard(op, i, 'iris'))}
          </div>
        </div>

        {/* Situator Column */}
        <div className="flex flex-col h-full bg-[#11111A]/60 border border-white/5 rounded-2xl md:rounded-[1.5rem] p-4 md:p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-5 pb-3 md:pb-4 border-b border-white/5">
            <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-lg md:rounded-xl border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] flex-shrink-0">
              <span className="text-blue-400 text-sm md:text-lg font-bold">🔵</span>
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">Situator</h2>
          </div>
          <div className="space-y-3 flex-grow flex flex-col overflow-y-auto pr-1.5 md:pr-2 custom-scrollbar">
            {getOperatorsByFocus("Situator").map((op, i) => renderOperatorCard(op, i, 'situator'))}
          </div>
        </div>

        {/* Apoio Column */}
        <div className="flex flex-col h-full bg-[#11111A]/60 border border-white/5 rounded-2xl md:rounded-[1.5rem] p-4 md:p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-5 pb-3 md:pb-4 border-b border-white/5">
            <div className="p-1.5 md:p-2 bg-emerald-500/10 rounded-lg md:rounded-xl border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] flex-shrink-0">
              <span className="text-emerald-400 text-sm md:text-lg font-bold">🟢</span>
            </div>
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">Apoio / Op.</h2>
          </div>
          <div className="space-y-3 flex-grow flex flex-col overflow-y-auto pr-1.5 md:pr-2 custom-scrollbar">
            {getOperatorsByFocus("Apoio").map((op, i) => renderOperatorCard(op, i, 'apoio'))}
          </div>
        </div>
      </main>

      {/* Footer / Telemetry */}
      <footer className="relative z-10 flex justify-between items-center pt-3 md:pt-4 flex-shrink-0 text-zinc-600 text-[0.65rem] md:text-xs font-semibold border-t border-zinc-800/80">
        <p className="tracking-[0.15em] uppercase">Central Patrimonium &copy; {new Date().getFullYear()}</p>
        <p className="font-mono opacity-50 tracking-widest text-[#555555]">v2.5.1</p>
      </footer>
    </div>
  );
};

export default TVPanel;