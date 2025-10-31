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

const formSchema = z.object({
  nome: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  tipo_turno: z.enum(["12x36_diurno", "12x36_noturno", "6x18"]),
  turno_12x36_tipo: z.enum(["A", "B"]).optional().nullable(),
  cargo: z.enum(["MI", "Líder de Turno", "LMI", "Gestor"]),
  horário_inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  horário_fim: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  ativo: z.boolean().default(true),
});

export type OperatorFormData = z.infer<typeof formSchema>;

interface OperatorFormProps {
  initialData: Operator | null;
  onSubmit: (data: OperatorFormData & { id?: string }) => void;
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
    },
  });

  const tipoTurno = useWatch({
    control: form.control,
    name: "tipo_turno",
  });

  const is12x36 = tipoTurno === "12x36_diurno" || tipoTurno === "12x36_noturno";

  const handleSubmit = (values: OperatorFormData) => {
    const dataToSubmit = { ...values, id: initialData?.id };
    if (!is12x36) {
      dataToSubmit.turno_12x36_tipo = null;
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
                    <SelectItem value="6x18">6x18</SelectItem>
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
                    <FormLabel>Horário Início</FormLabel>
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
                    <FormLabel>Horário Fim</FormLabel>
                    <FormControl>
                        <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

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