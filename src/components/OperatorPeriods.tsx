import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Operator } from "@/pages/OperatorManagement";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

type Period = Tables<"operador_periodos">;

interface OperatorPeriodsProps {
  operator: Operator;
  periods: Period[];
}

const periodSchema = z.object({
  horário_inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  horário_fim: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  foco: z.enum(["IRIS", "Situator", "Apoio", "Ambos"]),
  observação: z.string().optional(),
});

const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const OperatorPeriods = ({ operator, periods }: OperatorPeriodsProps) => {
  const queryClient = useQueryClient();
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);

  const form = useForm<z.infer<typeof periodSchema>>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      horário_inicio: "",
      horário_fim: "",
      foco: "IRIS",
      observação: "",
    },
  });

  if (!operator.horário_inicio || !operator.horário_fim) {
    return (
      <div className="p-4 border rounded-lg flex items-center justify-center h-full bg-secondary">
        <p className="text-muted-foreground text-center">
          Defina o horário de turno principal do operador para poder adicionar períodos de dedicação.
        </p>
      </div>
    );
  }

  const upsertMutation = useMutation({
    mutationFn: async (periodData: z.infer<typeof periodSchema>) => {
      const payload: TablesInsert<"operador_periodos"> = {
        id: editingPeriod?.id,
        operador_id: operator.id,
        horário_inicio: periodData.horário_inicio,
        horário_fim: periodData.horário_fim,
        foco: periodData.foco,
        observação: periodData.observação,
      };
      const { error } = await supabase.from("operador_periodos").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Período salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["periods", operator.id] });
      form.reset();
      setEditingPeriod(null);
    },
    onError: (error) => {
      toast.error("Erro ao salvar período", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operador_periodos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Período excluído!");
      queryClient.invalidateQueries({ queryKey: ["periods", operator.id] });
    },
    onError: (error) => {
      toast.error("Erro ao excluir", { description: error.message });
    },
  });

  const onSubmit = (values: z.infer<typeof periodSchema>) => {
    const mainStartMins = timeToMinutes(operator.horário_inicio!);
    const mainEndMins = timeToMinutes(operator.horário_fim!);
    const periodStartMins = timeToMinutes(values.horário_inicio);
    const periodEndMins = timeToMinutes(values.horário_fim);

    if (periodEndMins !== 0 && periodEndMins <= periodStartMins) {
        toast.error("Horário inválido", { description: "O horário de início deve ser anterior ao de fim." });
        return;
    }

    // --- Boundary and Overlap Validation using a normalized timeline ---
    let normMainEndMins = mainEndMins < mainStartMins ? mainEndMins + 1440 : mainEndMins;

    const normalizePeriod = (start: number, end: number) => {
        let normStart = start;
        let normEnd = end;
        if (normEnd < normStart) { normEnd += 1440; }
        if (mainEndMins < mainStartMins && normStart < mainStartMins) {
            normStart += 1440;
            normEnd += 1440;
        }
        return { start: normStart, end: normEnd };
    };

    const newPeriod = normalizePeriod(periodStartMins, periodEndMins);

    if (newPeriod.start < mainStartMins || newPeriod.end > normMainEndMins) {
      toast.error("Fora do turno", { description: "O período deve estar dentro do turno principal do operador." });
      return;
    }

    const isOverlapping = periods
      .filter(p => p.id !== editingPeriod?.id)
      .some(p => {
        const existingPeriod = normalizePeriod(timeToMinutes(p.horário_inicio), timeToMinutes(p.horário_fim));
        return newPeriod.start < existingPeriod.end && newPeriod.end > existingPeriod.start;
      });

    if (isOverlapping) {
      toast.error("Sobreposição de horários", { description: "Este período conflita com um já existente." });
      return;
    }

    upsertMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 border rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="horário_inicio" render={({ field }) => (
              <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="horário_fim" render={({ field }) => (
              <FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="foco" render={({ field }) => (
            <FormItem><FormLabel>Foco</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="IRIS">IRIS</SelectItem>
                <SelectItem value="Situator">Situator</SelectItem>
                <SelectItem value="Apoio">Apoio</SelectItem>
                <SelectItem value="Ambos">Ambos</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="observação" render={({ field }) => (
            <FormItem><FormLabel>Observação</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" className="w-full" style={{ backgroundColor: '#00CC66' }}>Adicionar Período</Button>
        </form>
      </Form>

      <div className="border rounded-lg">
        <Table>
          <TableHeader><TableRow><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Foco</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {periods.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.horário_inicio}</TableCell>
                <TableCell>{p.horário_fim}</TableCell>
                <TableCell>{p.foco}</TableCell>
                <TableCell>
                  <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OperatorPeriods;