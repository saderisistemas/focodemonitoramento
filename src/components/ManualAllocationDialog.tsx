import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isSaturday, isSunday } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Operator } from "@/pages/OperatorManagement";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Trash2 } from "lucide-react";

type ManualScheduleEntry = Tables<"escala_manual">;
type ManualPeriod = Tables<"escala_manual_periodos">;

interface ManualAllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ManualScheduleEntry & { operadores: Operator };
  dates: { label: string; value: string }[];
  operators: { id: string; nome: string }[];
}

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

const allocationSchema = z.object({
  data: z.string(),
  operador_id: z.string().uuid(),
  horario_inicio: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:MM)." }),
  horario_fim: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:MM)." }),
  foco: z.enum(["IRIS", "Situator", "Apoio"]),
  observacao: z.string().optional(),
});

const periodSchema = z.object({
  horario_inicio: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:MM)." }),
  horario_fim: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:MM)." }),
  foco: z.enum(["IRIS", "Situator", "Apoio"]),
  observacao: z.string().optional(),
});

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const ManualAllocationDialog = ({
  isOpen,
  onClose,
  initialData,
  dates,
  operators,
}: ManualAllocationDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const form = useForm<z.infer<typeof allocationSchema>>({
    resolver: zodResolver(allocationSchema),
  });

  const periodForm = useForm<z.infer<typeof periodSchema>>({
    resolver: zodResolver(periodSchema),
    defaultValues: { foco: "Apoio", observacao: "" },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        data: initialData.data,
        operador_id: initialData.operador_id,
        horario_inicio: initialData.horario_inicio,
        horario_fim: initialData.horario_fim,
        foco: initialData.foco,
        observacao: initialData.observacao || "",
      });
    } else {
      form.reset({
        data: dates[0]?.value,
        operador_id: undefined,
        horario_inicio: "",
        horario_fim: "",
        foco: "Apoio",
        observacao: "",
      });
    }
  }, [initialData, isOpen, form, dates]);

  const { data: periods, refetch: refetchPeriods } = useQuery({
    queryKey: ["manual_periods", initialData?.id],
    queryFn: async () => {
      if (!initialData?.id) return [];
      const { data, error } = await supabase
        .from("escala_manual_periodos")
        .select("*")
        .eq("escala_manual_id", initialData.id);
      if (error) throw error;
      return data;
    },
    enabled: !!initialData?.id,
  });

  const upsertAllocationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof allocationSchema>) => {
      const payload: TablesInsert<"escala_manual"> = {
        id: initialData?.id,
        data: values.data,
        operador_id: values.operador_id,
        horario_inicio: values.horario_inicio,
        horario_fim: values.horario_fim,
        foco: values.foco,
        observacao: values.observacao,
      };
      const { data, error } = await supabase
        .from("escala_manual")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Alocação salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["manual_schedule"] });
      queryClient.invalidateQueries({ queryKey: ["tv_panel_data_v2"] });
      onClose();
    },
    onError: (error) => toast.error("Erro ao salvar alocação", { description: error.message }),
  });

  const upsertPeriodMutation = useMutation({
    mutationFn: async (values: z.infer<typeof periodSchema>) => {
      if (!initialData?.id) throw new Error("ID da alocação não encontrado.");
      const payload: TablesInsert<"escala_manual_periodos"> = {
        escala_manual_id: initialData.id,
        horario_inicio: values.horario_inicio,
        horario_fim: values.horario_fim,
        foco: values.foco,
        observacao: values.observacao,
      };
      const { error } = await supabase.from("escala_manual_periodos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Período adicionado!");
      refetchPeriods();
      queryClient.invalidateQueries({ queryKey: ["tv_panel_data_v2"] });
      periodForm.reset({ foco: "Apoio", horario_inicio: "", horario_fim: "", observacao: "" });
    },
    onError: (error) => toast.error("Erro ao salvar período", { description: error.message }),
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("escala_manual_periodos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Período removido.");
      refetchPeriods();
      queryClient.invalidateQueries({ queryKey: ["tv_panel_data_v2"] });
    },
    onError: (error) => toast.error("Erro ao remover período", { description: error.message }),
  });

  const handleAddPeriod = (values: z.infer<typeof periodSchema>) => {
    const mainShift = form.getValues();
    const mainStart = timeToMinutes(mainShift.horario_inicio);
    const mainEnd = timeToMinutes(mainShift.horario_fim);
    const periodStart = timeToMinutes(values.horario_inicio);
    const periodEnd = timeToMinutes(values.horario_fim);

    if (periodStart < mainStart || periodEnd > mainEnd) {
      toast.error("Período fora do turno principal.");
      return;
    }
    upsertPeriodMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Alocação Manual" : "Nova Alocação Manual"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => upsertAllocationMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField name="data" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Data</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{dates.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField name="operador_id" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Operador</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                  <SelectContent>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField name="foco" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Foco Inicial</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="IRIS">IRIS</SelectItem>
                    <SelectItem value="Situator">Situator</SelectItem>
                    <SelectItem value="Apoio">Apoio</SelectItem>
                  </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField name="horario_inicio" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Horário Início</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="horario_fim" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Horário Fim</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField name="observacao" control={form.control} render={({ field }) => (
              <FormItem><FormLabel>Observação</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={upsertAllocationMutation.isPending}>Salvar Alocação</Button>
            </DialogFooter>
          </form>
        </Form>

        {isEditing && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-medium mb-4">Períodos de Foco</h3>
            <Form {...periodForm}>
              <form onSubmit={periodForm.handleSubmit(handleAddPeriod)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 items-end">
                  <FormField name="horario_inicio" control={periodForm.control} render={({ field }) => <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                  <FormField name="horario_fim" control={periodForm.control} render={({ field }) => <FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>} />
                  <FormField name="foco" control={periodForm.control} render={({ field }) => <FormItem><FormLabel>Foco</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="IRIS">IRIS</SelectItem><SelectItem value="Situator">Situator</SelectItem><SelectItem value="Apoio">Apoio</SelectItem></SelectContent></Select></FormItem>} />
                </div>
                <FormField name="observacao" control={periodForm.control} render={({ field }) => <FormItem><FormLabel>Observação (Período)</FormLabel><FormControl><Input placeholder="Opcional" {...field} /></FormControl></FormItem>} />
                <Button type="submit" disabled={upsertPeriodMutation.isPending} className="w-full">Adicionar Período</Button>
              </form>
            </Form>
            <div className="mt-4 space-y-2">
              {(periods || []).map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 bg-secondary rounded-md">
                  <p className="text-sm break-all">{p.horario_inicio} - {p.horario_fim}: <span className="font-semibold">{p.foco}</span> {p.observacao && <span className="italic text-muted-foreground">({p.observacao})</span>}</p>
                  <Button variant="ghost" size="icon" onClick={() => deletePeriodMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};