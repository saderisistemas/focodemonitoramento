import { useForm } from "react-hook-form";
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

const formSchema = z.object({
  nome: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  tipo_turno: z.enum(["12x36_diurno", "12x36_noturno", "6x18"]),
  foco_padrao: z.enum(["IRIS", "Situator", "Apoio"]),
  cor: z.string().regex(/^#[0-9A-F]{6}$/i, { message: "Cor inválida. Use o formato hexadecimal (ex: #FF8800)." }),
  horário_inicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  horário_fim: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  ativo: z.boolean().default(true),
});

type OperatorFormData = z.infer<typeof formSchema>;

interface OperatorFormProps {
  initialData: Operator | null;
  onSubmit: (data: OperatorFormData & { id?: string }) => void;
  isLoading: boolean;
}

const OperatorForm = ({ initialData, onSubmit, isLoading }: OperatorFormProps) => {
  const form = useForm<OperatorFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      tipo_turno: initialData?.tipo_turno || "12x36_diurno",
      foco_padrao: initialData?.foco_padrao || "IRIS",
      cor: initialData?.cor || "#FF8800",
      horário_inicio: initialData?.horário_inicio || "06:00",
      horário_fim: initialData?.horário_fim || "18:00",
      ativo: initialData?.ativo ?? true,
    },
  });

  const handleSubmit = (values: OperatorFormData) => {
    onSubmit({ ...values, id: initialData?.id });
  };

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <FormField
            control={form.control}
            name="foco_padrao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Foco Padrão</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o foco padrão" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="IRIS">🟠 IRIS</SelectItem>
                    <SelectItem value="Situator">🔵 Situator</SelectItem>
                    <SelectItem value="Apoio">🟢 Apoio</SelectItem>
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
            name="cor"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cor de Identificação</FormLabel>
                <FormControl>
                    <Input type="color" {...field} className="p-0 h-10"/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
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

        <Button type="submit" disabled={isLoading} className="w-full" size="lg" style={{ backgroundColor: '#FF8800' }}>
          {isLoading ? "Salvando..." : "Salvar Operador"}
        </Button>
      </form>
    </Form>
  );
};

export default OperatorForm;