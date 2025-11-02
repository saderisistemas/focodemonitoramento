import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Operator } from "@/pages/OperatorManagement";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import WeekdaySelector from "./WeekdaySelector";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/; // Allow optional seconds
const optionalTime = z.string().regex(timeRegex, { message: "Formato inválido." }).optional().nullable().or(z.literal(''));

const formSchema = z.object({
  nome: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  tipo_turno: z.enum(["12x36_diurno", "12x36_noturno", "6x18"]),
  turno_12x36_tipo: z.enum(["A", "B"]).optional().nullable(),
  cargo: z.enum(["MI", "Líder de Turno", "LMI", "Gestor"]),
  horário_inicio: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:MM)." }),
  horário_fim: z.string().regex(timeRegex, { message: "Formato de hora inválido (HH:MM)." }),
  ativo: z.boolean().default(true),
  dias_semana: z.array(z.string()).optional().nullable(),
  horario_inicio_sabado: optionalTime,
  horario_fim_sabado: optionalTime,
  horario_inicio_domingo: optionalTime,
  horario_fim_domingo: optionalTime,
}).superRefine((data, ctx) => {
    if (data.tipo_turno === '6x18') {
        if ((data.horario_inicio_sabado && !data.horario_fim_sabado) || (!data.horario_inicio_sabado && data.horario_fim_sabado)) {
            ctx.addIssue({ code: 'custom', message: 'Preencha início e fim para Sábado.', path: ['horario_fim_sabado'] });
        }
        if ((data.horario_inicio_domingo && !data.horario_fim_domingo) || (!data.horario_inicio_domingo && data.horario_fim_domingo)) {
            ctx.addIssue({ code: 'custom', message: 'Preencha início e fim para Domingo.', path: ['horario_fim_domingo'] });
        }
    }
});

export type OperatorFormData = z.infer<typeof formSchema>;

interface OperatorFormProps {
  initialData: Operator | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onClear: () => void;
  onDelete?: () => void;
}

const OperatorForm = ({ initialData, onSubmit, isLoading, onClear, onDelete }: OperatorFormProps) => {
  const form = useForm<OperatorFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      tipo_turno: initialData?.tipo_turno || "12x36_diurno",
      turno_12x36_tipo: initialData?.turno_12x36_tipo || null,
      cargo: initialData?.cargo || "MI",
      horário_inicio: initialData?.horário_inicio || "06:00",
      horário_fim: initialData?.horário_fim || "18:00",
      ativo: initialData?.ativo ?? true,
      dias_semana: initialData?.dias_semana ? initialData.dias_semana.split(',') : [],
      horario_inicio_sabado: initialData?.horario_inicio_sabado || "",
      horario_fim_sabado: initialData?.horario_fim_sabado || "",
      horario_inicio_domingo: initialData?.horario_inicio_domingo || "",
      horario_fim_domingo: initialData?.horario_fim_domingo || "",
    },
  });

  const tipoTurno = useWatch({
    control: form.control,
    name: "tipo_turno",
  });

  const is12x36 = tipoTurno === "12x36_diurno" || tipoTurno === "12x36_noturno";
  const is6x18 = tipoTurno === "6x18";

  const handleSubmit = (values: OperatorFormData) => {
    const dataToSubmit: any = { ...values, id: initialData?.id };

    if (values.tipo_turno === '6x18') {
        dataToSubmit.dias_semana = values.dias_semana ? values.dias_semana.join(',') : null;
        dataToSubmit.turno_12x36_tipo = null;
    } else { // It's a 12x36 shift
        dataToSubmit.dias_semana = null;
        dataToSubmit.horario_inicio_sabado = null;
        dataToSubmit.horario_fim_sabado = null;
        dataToSubmit.horario_inicio_domingo = null;
        dataToSubmit.horario_fim_domingo = null;
    }
    
    onSubmit(dataToSubmit);
  };

  const handleClear = () => {
    form.reset({
        nome: "",
        tipo_turno: "12x36_diurno",
        turno_12x36_tipo: null,
        cargo: "MI",
        horário_inicio: "06:00",
        horário_fim: "18:00",
        ativo: true,
        dias_semana: [],
        horario_inicio_sabado: "",
        horario_fim_sabado: "",
        horario_inicio_domingo: "",
        horario_fim_domingo: "",
    });
    onClear();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do operador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="tipo_turno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Turno</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de turno" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="12x36_diurno">12x36 Diurno</SelectItem>
                    <SelectItem value="12x36_noturno">12x36 Noturno</SelectItem>
                    <SelectItem value="6x18">6x18 Fixo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {is12x36 && (
            <FormField
              control={form.control}
              name="turno_12x36_tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turno 12x36</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione A ou B" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A">Turno A</SelectItem>
                      <SelectItem value="B">Turno B</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="cargo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MI">MI (Monitor Interno)</SelectItem>
                    <SelectItem value="Líder de Turno">Líder de Turno</SelectItem>
                    <SelectItem value="LMI">LMI (Líder de Monitor Interno)</SelectItem>
                    <SelectItem value="Gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="horário_inicio"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{is6x18 ? "Horário Início (Semana)" : "Horário Início"}</FormLabel>
                    <FormControl>
                        <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="horário_fim"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{is6x18 ? "Horário Fim (Semana)" : "Horário Fim"}</FormLabel>
                    <FormControl>
                        <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        {is6x18 && (
            <div className="space-y-6 p-4 border rounded-lg bg-secondary">
                <FormField
                    control={form.control}
                    name="dias_semana"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <WeekdaySelector value={field.value || []} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name="horario_inicio_sabado" control={form.control} render={({field}) => (
                        <FormItem><FormLabel>Início Sábado</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="horario_fim_sabado" control={form.control} render={({field}) => (
                        <FormItem><FormLabel>Fim Sábado</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name="horario_inicio_domingo" control={form.control} render={({field}) => (
                        <FormItem><FormLabel>Início Domingo</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="horario_fim_domingo" control={form.control} render={({field}) => (
                        <FormItem><FormLabel>Fim Domingo</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <FormField
            control={form.control}
            name="ativo"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">Operador Ativo</FormLabel>
                </div>
                <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                </FormItem>
            )}
            />
        </div>

        <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1 btn-success" size="lg">
                {isLoading ? "Salvando..." : "Salvar Operador"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClear} size="lg">Limpar Campos</Button>
            {onDelete && (
                 <AlertDialog>
                 <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="lg" className="btn-danger">Excluir</Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                   <AlertDialogHeader>
                     <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                     <AlertDialogDescription>
                       Essa ação não pode ser desfeita. Isso excluirá permanentemente o operador.
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                     <AlertDialogAction onClick={onDelete} className="btn-danger">
                       Excluir
                     </AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
            )}
        </div>
      </form>
    </Form>
  );
};

export default OperatorForm;