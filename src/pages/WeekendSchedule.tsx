import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, nextSaturday, nextSunday, isSaturday, isSunday, getDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Trash2 } from "lucide-react";
import { Operator } from "./OperatorManagement";

type ManualScheduleEntry = {
  id: string;
  data: string;
  operador_id: string;
  horario_inicio: string;
  horario_fim: string;
  foco: string;
  observacao?: string;
  operadores: Operator;
};

const manualAllocationSchema = z.object({
  data: z.string().refine(val => {
    const date = new Date(val + 'T00:00:00');
    return isSaturday(date) || isSunday(date);
  }, { message: "A data deve ser um sábado ou domingo." }),
  operador_id: z.string().uuid({ message: "Selecione um operador." }),
  foco: z.enum(["IRIS", "Situator", "Apoio"]),
  horario_inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  horario_fim: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  observacao: z.string().optional(),
});

const WeekendSchedule = () => {
  const queryClient = useQueryClient();
  const [saturday, sunday] = useMemo(() => {
    const today = new Date();
    return [nextSaturday(today), nextSunday(today)];
  }, []);

  const queryKey = ["manual_schedule", format(saturday, "yyyy-MM-dd")];

  const { data: config } = useQuery({
    queryKey: ["scale_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_escala")
        .select("turno_a_trabalha_em_dias")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: autoOperators } = useQuery({
    queryKey: ["operators_12x36"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operadores")
        .select("*")
        .in("tipo_turno", ["12x36_diurno", "12x36_noturno"])
        .eq("ativo", true);
      if (error) throw error;
      return data as Operator[];
    },
  });

  const { data: manualOperatorsList } = useQuery({
    queryKey: ["operators_6x18"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operadores")
        .select("id, nome")
        .eq("tipo_turno", "6x18")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: manualSchedule } = useQuery({
    queryKey: queryKey,
    queryFn: async (): Promise<ManualScheduleEntry[]> => {
      const { data, error } = await supabase
        .from("escala_manual")
        .select("*, operadores(*)")
        .in("data", [format(saturday, "yyyy-MM-dd"), format(sunday, "yyyy-MM-dd")]);
      if (error) throw error;
      return data as ManualScheduleEntry[];
    },
  });

  const form = useForm<z.infer<typeof manualAllocationSchema>>({
    resolver: zodResolver(manualAllocationSchema),
    defaultValues: { data: format(saturday, "yyyy-MM-dd") },
  });

  const allocationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof manualAllocationSchema>) => {
      const { data, error } = await supabase
        .from("escala_manual")
        .insert(values as any)
        .select("*, operadores(*)")
        .single();
      if (error) throw error;
      return data as ManualScheduleEntry;
    },
    onSuccess: (newAllocation) => {
      toast.success("Alocação salva com sucesso!");
      queryClient.setQueryData<ManualScheduleEntry[]>(queryKey, (oldData) => {
        return oldData ? [...oldData, newAllocation] : [newAllocation];
      });
      form.reset({ data: format(saturday, "yyyy-MM-dd") });
    },
    onError: (error) => toast.error("Erro ao salvar", { description: error.message }),
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: async (id: string) => {
        const { error } = await supabase.from("escala_manual").delete().eq("id", id);
        if (error) throw error;
        return id;
    },
    onSuccess: (deletedId) => {
        toast.success("Alocação removida com sucesso!");
        queryClient.setQueryData<ManualScheduleEntry[]>(queryKey, (oldData) => {
            return oldData ? oldData.filter(item => item.id !== deletedId) : [];
        });
    },
    onError: (error) => toast.error("Erro ao remover", { description: error.message }),
  });

  const getScheduleForDay = (date: Date) => {
    if (!config || !autoOperators) return [];

    const dayOfMonth = getDate(date);
    const isEvenDay = dayOfMonth % 2 === 0;
    const turnAWorksOnEven = config.turno_a_trabalha_em_dias === 'pares';

    const filteredAutoOperators = autoOperators.filter(op => {
      if (op.turno_12x36_tipo === 'A') return isEvenDay === turnAWorksOnEven;
      if (op.turno_12x36_tipo === 'B') return isEvenDay !== turnAWorksOnEven;
      return false;
    });

    const auto = filteredAutoOperators.map(op => ({ ...op, type: "Auto" }));
    const manual = (manualSchedule || [])
      .filter(item => item.data === format(date, "yyyy-MM-dd"))
      .map(item => ({ ...item.operadores, type: "Manual", ...item }));
    return [...auto, ...manual];
  };

  const saturdaySchedule = getScheduleForDay(saturday);
  const sundaySchedule = getScheduleForDay(sunday);
  const combinedSchedule = [...saturdaySchedule.map(s => ({...s, date: saturday})), ...sundaySchedule.map(s => ({...s, date: sunday}))];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">Escala de Finais de Semana</h1>
          <p className="text-muted-foreground mb-4">
            Controle e visualização completa da escala operacional do final de semana.
          </p>
          <div className="text-lg font-semibold text-iris">
            Próximo sábado: {format(saturday, "dd/MM/yyyy", { locale: ptBR })} • Próximo domingo: {format(sunday, "dd/MM/yyyy", { locale: ptBR })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alocação Manual (Operadores 6x18)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => allocationMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Data</Label>
                  <Select onValueChange={(val) => form.setValue('data', val)} defaultValue={format(saturday, "yyyy-MM-dd")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={format(saturday, "yyyy-MM-dd")}>Sábado ({format(saturday, "dd/MM")})</SelectItem>
                      <SelectItem value={format(sunday, "yyyy-MM-dd")}>Domingo ({format(sunday, "dd/MM")})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operador</Label>
                  <Select onValueChange={(val) => form.setValue('operador_id', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {(manualOperatorsList || []).map(op => <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Foco Inicial</Label>
                  <Select onValueChange={(val) => form.setValue('foco', val as any)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IRIS">IRIS</SelectItem>
                      <SelectItem value="Situator">Situator</SelectItem>
                      <SelectItem value="Apoio">Apoio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Horário Início</Label>
                  <Input type="time" {...form.register("horario_inicio")} />
                </div>
                <div>
                  <Label>Horário Fim</Label>
                  <Input type="time" {...form.register("horario_fim")} />
                </div>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea {...form.register("observacao")} />
              </div>
              <Button type="submit" className="w-full btn-success">
                <PlusCircle className="mr-2 h-4 w-4" /> Salvar Alocação
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader><CardTitle>Sábado ({format(saturday, "dd/MM")})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {saturdaySchedule.map(op => (
                <div key={op.id + op.type} className="p-4 rounded-lg bg-secondary border border-border">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg">{op.nome}</p>
                    <Badge variant={op.type === 'Auto' ? 'default' : 'secondary'}>{op.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{op.horário_inicio} - {op.horário_fim}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Domingo ({format(sunday, "dd/MM")})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {sundaySchedule.map(op => (
                <div key={op.id + op.type} className="p-4 rounded-lg bg-secondary border border-border">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg">{op.nome}</p>
                    <Badge variant={op.type === 'Auto' ? 'default' : 'secondary'}>{op.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{op.horário_inicio} - {op.horário_fim}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader><CardTitle>Tabela Geral de Escala</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Operador</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Horário</TableHead>
                            <TableHead>Foco</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {combinedSchedule.map(op => (
                            <TableRow key={op.id + op.date.toISOString()}>
                                <TableCell><Badge variant={op.type === 'Auto' ? 'default' : 'secondary'}>{op.type}</Badge></TableCell>
                                <TableCell>{op.nome}</TableCell>
                                <TableCell>{format(op.date, "dd/MM (EEE)", { locale: ptBR })}</TableCell>
                                <TableCell>{op.horário_inicio} - {op.horário_fim}</TableCell>
                                <TableCell>{(op as any).foco_padrao || (op as any).foco}</TableCell>
                                <TableCell className="text-right">
                                    {op.type === 'Manual' && (
                                        <Button variant="destructive" size="icon" onClick={() => deleteAllocationMutation.mutate((op as any).id)} className="btn-danger">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeekendSchedule;