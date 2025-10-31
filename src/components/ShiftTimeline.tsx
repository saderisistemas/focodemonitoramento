import { Operator } from "@/pages/OperatorManagement";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Period = Tables<"operador_periodos">;

interface ShiftTimelineProps {
  operator: Operator;
  periods: Period[];
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getFocusColorClass = (focus: string) => {
  switch (focus) {
    case "IRIS": return "bg-iris";
    case "Situator": return "bg-situator";
    case "Apoio": return "bg-apoio";
    case "Ambos": return "bg-primary";
    default: return "bg-muted";
  }
};

export const ShiftTimeline = ({ operator, periods }: ShiftTimelineProps) => {
  if (!operator.horário_inicio || !operator.horário_fim) {
    return <p>Horário do turno principal não definido.</p>;
  }

  const shiftStart = timeToMinutes(operator.horário_inicio);
  const shiftEnd = timeToMinutes(operator.horário_fim);
  const totalDuration = shiftEnd > shiftStart ? shiftEnd - shiftStart : (1440 - shiftStart) + shiftEnd;

  if (totalDuration <= 0) {
    return <p>Duração do turno inválida.</p>;
  }

  const sortedPeriods = [...periods].sort((a, b) => {
    let aStart = timeToMinutes(a.horário_inicio);
    let bStart = timeToMinutes(b.horário_inicio);
    if (aStart < shiftStart) aStart += 1440;
    if (bStart < shiftStart) bStart += 1440;
    return aStart - bStart;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do Tempo do Turno</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative w-full bg-secondary rounded-full h-8 overflow-hidden">
            {sortedPeriods.map((period) => {
              const periodStart = timeToMinutes(period.horário_inicio);
              const periodEnd = timeToMinutes(period.horário_fim);
              
              const isPeriodNightShift = periodStart > periodEnd;
              const duration = isPeriodNightShift ? (1440 - periodStart) + periodEnd : periodEnd - periodStart;
              
              const normalizedPeriodStart = periodStart < shiftStart ? periodStart + 1440 : periodStart;
              const offset = normalizedPeriodStart - shiftStart;

              const left = (offset / totalDuration) * 100;
              const width = (duration / totalDuration) * 100;

              return (
                <div
                  key={period.id}
                  className={`absolute h-full ${getFocusColorClass(period.foco)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}
          </div>
          <div className="space-y-2">
            {sortedPeriods.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-sm ${getFocusColorClass(p.foco)}`} />
                <span>{p.horário_inicio} - {p.horário_fim}:</span>
                <span className="font-semibold">{p.foco}</span>
                {p.observação && <span className="text-muted-foreground">({p.observação})</span>}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftTimeline;