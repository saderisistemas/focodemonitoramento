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
  const totalDuration = shiftEnd - shiftStart;

  if (totalDuration <= 0) {
    return <p>Duração do turno inválida.</p>;
  }

  const sortedPeriods = [...periods].sort((a, b) => timeToMinutes(a.horário_inicio) - timeToMinutes(b.horário_inicio));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do Tempo do Turno</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="w-full bg-secondary rounded-full h-8 flex overflow-hidden">
            {sortedPeriods.map((period) => {
              const periodStart = timeToMinutes(period.horário_inicio);
              const periodEnd = timeToMinutes(period.horário_fim);
              const duration = periodEnd - periodStart;
              const marginLeft = ((periodStart - shiftStart) / totalDuration) * 100;
              const width = (duration / totalDuration) * 100;

              return (
                <div
                  key={period.id}
                  className={`h-full ${getFocusColorClass(period.foco)}`}
                  style={{ position: 'absolute', left: `${marginLeft}%`, width: `${width}%` }}
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