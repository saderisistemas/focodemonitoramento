import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Settings, ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TablesInsert } from "@/integrations/supabase/types";

const configSchema = z.object({
  turno_a_trabalha_em_dias: z.string(),
  lider_diurno_a_nome: z.string().min(1, "O nome é obrigatório."),
  lider_diurno_b_nome: z.string().min(1, "O nome é obrigatório."),
  lider_noturno_nome: z.string().min(1, "O nome é obrigatório."),
});

type ConfigFormData = z.infer<typeof configSchema>;

const ScaleConfig = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["scale_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracao_escala")
        .select("turno_a_trabalha_em_dias, lider_diurno_a_nome, lider_diurno_b_nome, lider_noturno_nome")
        .eq("id", 1)
        .single();
      // Se não houver erro, mas data for null (o que pode acontecer se a linha não existir), retorne um objeto padrão
      if (!error && !data) {
        return {
          turno_a_trabalha_em_dias: 'pares',
          lider_diurno_a_nome: '',
          lider_diurno_b_nome: '',
          lider_noturno_nome: '',
        }
      }
      if (error && error.code !== 'PGRST116') { // PGRST116: 0 rows found
        throw error;
      }
      return data;
    },
  });

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      turno_a_trabalha_em_dias: "pares",
      lider_diurno_a_nome: "",
      lider_diurno_b_nome: "",
      lider_noturno_nome: "",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        turno_a_trabalha_em_dias: config.turno_a_trabalha_em_dias || 'pares',
        lider_diurno_a_nome: config.lider_diurno_a_nome || '',
        lider_diurno_b_nome: config.lider_diurno_b_nome || '',
        lider_noturno_nome: config.lider_noturno_nome || '',
      });
    }
  }, [config, form]);

  const mutation = useMutation({
    mutationFn: async (newConfig: ConfigFormData) => {
      const payload: TablesInsert<"configuracao_escala"> = {
        id: 1,
        turno_a_trabalha_em_dias: newConfig.turno_a_trabalha_em_dias,
        lider_diurno_a_nome: newConfig.lider_diurno_a_nome,
        lider_diurno_b_nome: newConfig.lider_diurno_b_nome,
        lider_noturno_nome: newConfig.lider_noturno_nome,
      };
      const { error } = await supabase
        .from("configuracao_escala")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["scale_config"] });
      queryClient.invalidateQueries({ queryKey: ["tv_panel_data_v2"] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar configuração", { description: error.message });
    },
  });

  const onSubmit = (values: ConfigFormData) => {
    mutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-background p-8 pb-20">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="w-8 h-8 text-primary" />
                  <CardTitle className="text-4xl">Regras da Escala</CardTitle>
                </div>
                <CardDescription>
                  Defina as regras de trabalho para os turnos 12x36 (A e B).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <FormField
                    control={form.control}
                    name="turno_a_trabalha_em_dias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg">Regra dos Turnos 12x36</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full text-lg p-6">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pares">Turno A trabalha em dias PARES, Turno B em dias ÍMPARES.</SelectItem>
                            <SelectItem value="impares">Turno A trabalha em dias ÍMPARES, Turno B em dias PARES.</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-8 h-8 text-primary" />
                  <CardTitle className="text-3xl">Líderes de Plantão</CardTitle>
                </div>
                <CardDescription>
                  Defina os nomes dos líderes para cada turno que aparecerão no painel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="lider_diurno_a_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Líder Diurno - Turno A (07h-19h)</FormLabel>
                          <FormControl><Input placeholder="Nome do líder" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lider_diurno_b_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Líder Diurno - Turno B (07h-19h)</FormLabel>
                          <FormControl><Input placeholder="Nome do líder" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lider_noturno_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Líder Noturno (19h-07h)</FormLabel>
                          <FormControl><Input placeholder="Nome do líder" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Button type="submit" disabled={mutation.isPending} size="lg" className="w-full">
              {mutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ScaleConfig;