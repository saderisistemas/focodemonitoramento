import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, nextSaturday, nextSunday, isSaturday, isSunday, getDate, previousSaturday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { Operator } from "./OperatorManagement";
import { ManualAllocationDialog } from "@/components/ManualAllocationDialog";
import { Tables } from "@/integrations/supabase/types";

type ManualScheduleEntry = Tables<"escala_manual"> & { operadores: Operator };

const WeekendSchedule = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ManualScheduleEntry | undefined>(undefined);

  const {
    currentSaturday,
    currentSunday,
    nextWkSaturday,
    nextWkSunday,
  } = useMemo(() => {
    const today = new Date();
    let cs, csu;
    if (isSaturday(today)) {
      cs = today;
      csu = nextSunday(today);
    } else if (isSunday(today)) {
      csu = today;
      cs = previousSaturday(today);
    } else {
      cs = nextSaturday(today);
      csu = nextSunday(today);
    }
    return {
      currentSaturday: cs,
      currentSunday: csu,
      nextWkSaturday: addDays(cs, 7),
      nextWkSunday: addDays(csu, 7),
    };
  }, []);

  const datesToFetch = useMemo(() => [
    format(currentSaturday, "yyyy-MM-dd"),
    format(currentSunday, "yyyy-MM-dd"),
    format(nextWkSaturday, "yyyy-MM-dd"),
    format(nextWkSunday, "yyyy-MM-dd"),
  ], [currentSaturday, currentSunday, nextWkSaturday, nextWkSunday]);

  const { data: config } = useQuery({
    queryKey: ["scale_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracao_escala").select("turno_a_trabalha_em_dias").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: autoOperators } = useQuery({
    queryKey: ["operators_12x36"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operadores").select("*").in("tipo_turno", ["12x36_diurno", "12x36_noturno"]).eq("ativo", true);
      if (error) throw error;
      return data as Operator[];
    },
  });

  const { data: manualOperatorsList } = useQuery({
    queryKey: ["operators_6x18"],
    queryFn: async () => {
      const { data, error } = await supabase.from("operadores").select("id, nome").eq("tipo_turno", "6x18").eq("ativo", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: manualSchedule } = useQuery({
    queryKey: ["manual_schedule", datesToFetch],
    queryFn: async (): Promise<ManualScheduleEntry[]> => {
      const { data, error } = await supabase.from("escala_manual").select("*, operadores(*)").in("data", datesToFetch);
      if (error) throw error;
      return data as ManualScheduleEntry[];
    },
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("escala_manual").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alocação removida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["manual_schedule"] });
    },
    onError: (error) => toast.error("Erro ao remover", { description: error.message }),
  });

  const getScheduleForDay = (date: Date) => {
    if (!config || !autoOperators) return [];
    const dayOfMonth = getDate(date);
    const isEvenDay = dayOfMonth % 2 === 0;
    const turnAWorksOnEven = config.turno_a_trabalha_em_dias === 'pares';

    const auto = autoOperators
      .filter(op => {
        if (op.turno_12x36_tipo === 'A') return isEvenDay === turnAWorksOnEven;
        if (op.turno_12x36_tipo === 'B') return isEvenDay !== turnAWorksOnEven;
        return false;
      })
      .map(op => ({ 
        ...op, 
        type: "Auto", 
        foco: "Apoio",
        horario_inicio: op.horário_inicio,
        horario_fim: op.horário_fim,
      }));

    const manual = (manualSchedule || [])
      .filter(item => item.data === format(date, "yyyy-MM-dd"))
      .map(item => ({ ...item.operadores, ...item, type: "Manual" }));
      
    return [...auto, ...manual];
  };

  const handleOpenDialog = (allocation?: ManualScheduleEntry) => {
    setEditingAllocation(allocation);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingAllocation(undefined);
    setIsDialogOpen(false);
  };

  const weekendDates = useMemo(() => [
    { label: `Sábado (${format(currentSaturday, "dd/MM")})`, value: format(currentSaturday, "yyyy-MM-dd") },
    { label: `Domingo (${format(currentSunday, "dd/MM")})`, value: format(currentSunday, "yyyy-MM-dd") },
    { label: `Próximo Sábado (${format(nextWkSaturday, "dd/MM")})`, value: format(nextWkSaturday, "yyyy-MM-dd") },
    { label: `Próximo Domingo (${format(nextWkSunday, "dd/MM")})`, value: format(nextWkSunday, "yyyy-MM-dd") },
  ], [currentSaturday, currentSunday, nextWkSaturday, nextWkSunday]);

  const combinedSchedule = useMemo(() => [
    ...getScheduleForDay(currentSaturday).map(s => ({...s, date: currentSaturday})),
    ...getScheduleForDay(currentSunday).map(s => ({...s, date: currentSunday})),
    ...getScheduleForDay(nextWkSaturday).map(s => ({...s, date: nextWkSaturday})),
    ...getScheduleForDay(nextWkSunday).map(s => ({...s, date: nextWkSunday})),
  ], [manualSchedule, autoOperators, config, currentSaturday, currentSunday, nextWkSaturday, nextWkSunday]);

  return (
    <div className="min-h-screen bg-background p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">Escala de Finais de Semana</h1>
          <p className="text-muted-foreground mb-4">
            Controle e visualização completa da escala operacional do final de semana.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gerenciamento de Escala</CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Alocação Manual
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Foco Inicial</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedSchedule.map(op => (
                  <TableRow key={op.id + op.date.toISOString()}>
                    <TableCell><Badge variant={op.type === 'Auto' ? 'default' : 'secondary'}>{op.type}</Badge></TableCell>
                    <TableCell>{op.nome}</TableCell>
                    <TableCell>{format(op.date, "dd/MM (EEE)", { locale: ptBR })}</TableCell>
                    <TableCell>{op.horario_inicio} - {op.horario_fim}</TableCell>
                    <TableCell>{op.foco}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {op.type === 'Manual' && (
                        <>
                          <Button variant="outline" size="icon" onClick={() => handleOpenDialog(op as any)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => deleteAllocationMutation.mutate(op.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <ManualAllocationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        initialData={editingAllocation}
        dates={weekendDates}
        operators={manualOperatorsList || []}
      />
    </div>
  );
};

export default WeekendSchedule;