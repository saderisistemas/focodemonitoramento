import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users } from "lucide-react";

type FocusArea = "IRIS" | "Situator" | "Apoio";
type OperatorStatus = "Em operação" | "Pausa" | "Fora de turno";

interface Operator {
  id: string;
  nome: string;
  foco_padrao: FocusArea;
  tipo_turno: string;
  cor: string;
  status?: OperatorStatus;
}

const TVPanel = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [operators, setOperators] = useState<Operator[]>([]);
  const [currentLeader, setCurrentLeader] = useState<string>("Danilo");

  useEffect(() => {
    // Update clock every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchOperators();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("tv-panel-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operadores" },
        () => fetchOperators()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_realtime" },
        () => fetchOperators()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Determine current leader based on time
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 14) {
      setCurrentLeader("Angélica");
    } else if (hour >= 14 && hour < 22) {
      setCurrentLeader("Alan");
    } else {
      setCurrentLeader("Santana");
    }
  }, [currentTime]);

  const fetchOperators = async () => {
    const { data: operatorsData } = await supabase
      .from("operadores")
      .select("*")
      .eq("ativo", true);

    if (operatorsData) {
      const { data: statusData } = await supabase
        .from("status_realtime")
        .select("*");

      const operatorsWithStatus = operatorsData.map((op) => ({
        ...op,
        status:
          statusData?.find((s) => s.operador_id === op.id)?.status ||
          "Fora de turno",
      }));

      setOperators(operatorsWithStatus);
    }
  };

  const getOperatorsByFocus = (focus: FocusArea) =>
    operators.filter((op) => op.foco_padrao === focus);

  const getStatusIcon = (status?: OperatorStatus) => {
    switch (status) {
      case "Em operação":
        return <div className="w-4 h-4 rounded-full status-active pulse-glow" />;
      case "Pausa":
        return <div className="w-4 h-4 rounded-full status-pause pulse-glow" />;
      default:
        return <div className="w-4 h-4 rounded-full status-off" />;
    }
  };

  const getCardClass = (focus: FocusArea) => {
    switch (focus) {
      case "IRIS":
        return "operator-card-iris";
      case "Situator":
        return "operator-card-situator";
      case "Apoio":
        return "operator-card-apoio";
    }
  };

  const getFocusColor = (focus: FocusArea) => {
    switch (focus) {
      case "IRIS":
        return "text-iris";
      case "Situator":
        return "text-situator";
      case "Apoio":
        return "text-apoio";
    }
  };

  const getCurrentShift = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 18) {
      return { name: "Diurno", color: "border-iris" };
    }
    return { name: "Noturno", color: "border-situator" };
  };

  const shift = getCurrentShift();

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <header className={`mb-8 border-b-4 ${shift.color} pb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-2">
              Central Patrimonium
            </h1>
            <p className="text-2xl text-muted-foreground">
              Escala em Tempo Real
            </p>
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
            <div className="text-lg text-muted-foreground">
              Turno: {shift.name}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Columns */}
      <div className="grid grid-cols-3 gap-8 mb-8">
        {/* IRIS Column */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-iris" />
            <h2 className="text-3xl font-bold text-iris">🟠 IRIS</h2>
          </div>
          <div className="space-y-4">
            {getOperatorsByFocus("IRIS").map((operator) => (
              <div
                key={operator.id}
                className={`${getCardClass("IRIS")} rounded-2xl p-6 transition-all duration-300`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">{operator.nome}</h3>
                  {getStatusIcon(operator.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {operator.tipo_turno.replace("_", " ").toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Situator Column */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-situator" />
            <h2 className="text-3xl font-bold text-situator">🔵 Situator</h2>
          </div>
          <div className="space-y-4">
            {getOperatorsByFocus("Situator").map((operator) => (
              <div
                key={operator.id}
                className={`${getCardClass("Situator")} rounded-2xl p-6 transition-all duration-300`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">{operator.nome}</h3>
                  {getStatusIcon(operator.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {operator.tipo_turno.replace("_", " ").toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Apoio Column */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-apoio" />
            <h2 className="text-3xl font-bold text-apoio">
              🟢 Apoio/Supervisão
            </h2>
          </div>
          <div className="space-y-4">
            {getOperatorsByFocus("Apoio").map((operator) => (
              <div
                key={operator.id}
                className={`${getCardClass("Apoio")} rounded-2xl p-6 transition-all duration-300`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">{operator.nome}</h3>
                  {getStatusIcon(operator.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {operator.tipo_turno.replace("_", " ").toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
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
