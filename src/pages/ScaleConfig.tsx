import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ScaleConfig = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
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

  const mutation = useMutation({
    mutationFn: async (newConfig: { turno_a_trabalha_em_dias: string }) => {
      const { error } = await supabase
        .from("configuracao_escala")
        .update(newConfig)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["scale_config"] });
      queryClient.invalidateQueries({ queryKey: ["tv_panel_data"] });
      queryClient.invalidateQueries({ queryKey: ["operators_12x36"] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar configuração", { description: error.message });
    },
  });

  const handleSave = (value: string) => {
    mutation.mutate({ turno_a_trabalha_em_dias: value });
  };

  return (
    <div className="min-h-screen bg-background p-8 pb-20">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-primary" />
              <CardTitle className="text-4xl">Configuração da Escala</CardTitle>
            </div>
            <p className="text-muted-foreground">
              Defina as regras de trabalho para os turnos 12x36 (A e B).
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p>Carregando configuração...</p>
            ) : (
              <div className="space-y-2">
                <Label className="text-lg">Regra dos Turnos</Label>
                <Select
                  defaultValue={config?.turno_a_trabalha_em_dias}
                  onValueChange={handleSave}
                >
                  <SelectTrigger className="w-full text-lg p-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pares">
                      Turno A trabalha em dias PARES, Turno B em dias ÍMPARES.
                    </SelectItem>
                    <SelectItem value="impares">
                      Turno A trabalha em dias ÍMPARES, Turno B em dias PARES.
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground pt-2">
                  Esta regra será aplicada automaticamente no Painel TV e na Escala de Fim de Semana.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScaleConfig;