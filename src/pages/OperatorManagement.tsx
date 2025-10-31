import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OperatorForm, { OperatorFormData } from "@/components/OperatorForm";
import OperatorTable from "@/components/OperatorTable";
import OperatorPeriods from "@/components/OperatorPeriods";
import ShiftTimeline from "@/components/ShiftTimeline";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Operator = Tables<"operadores"> & {
  turno_12x36_tipo?: "A" | "B" | null;
};
export type Period = Tables<"operador_periodos">;

const OperatorManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);

  // Fetch all operators for the table
  const { data: operators, isLoading: isLoadingOperators } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operadores")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Operator[];
    },
  });

  // Fetch periods for the selected operator
  const { data: periods, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ["periods", selectedOperator?.id],
    queryFn: async () => {
      if (!selectedOperator?.id) return [];
      const { data, error } = await supabase
        .from("operador_periodos")
        .select("*")
        .eq("operador_id", selectedOperator.id)
        .order("horário_inicio", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!selectedOperator,
  });

  // Create/Update operator mutation
  const upsertMutation = useMutation({
    mutationFn: async (operatorData: TablesInsert<"operadores">) => {
      const { data, error } = await supabase
        .from("operadores")
        .upsert(operatorData, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (newOrUpdatedOperator) => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success(selectedOperator ? "Operador atualizado!" : "Operador criado com sucesso!");
      setSelectedOperator(newOrUpdatedOperator as Operator);
    },
    onError: (error) => {
      toast.error("Erro ao salvar", { description: error.message });
    },
  });

  // Delete operator mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operadores").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Operador excluído!");
      if (selectedOperator?.id === deletedId) {
        setSelectedOperator(null);
      }
    },
    onError: (error) => {
      toast.error("Erro ao excluir", { description: error.message });
    },
  });

  const handleSelectOperator = (operator: Operator) => {
    setSelectedOperator(operator);
  };
  
  const handleClearSelection = () => {
    setSelectedOperator(null);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="bg-card rounded-2xl p-8 border border-border space-y-12">
          {/* Operator Form Section */}
          <div>
            <h1 className="text-4xl font-bold mb-2 text-accent-orange">Gestão de Operadores</h1>
            <p className="text-muted-foreground mb-6">
              Cadastre, edite e defina períodos de atuação de cada operador.
            </p>
            <OperatorForm
              key={selectedOperator?.id || 'new'}
              initialData={selectedOperator}
              onSubmit={(data) => upsertMutation.mutate(data as TablesInsert<"operadores">)}
              isLoading={upsertMutation.isPending}
              onClear={handleClearSelection}
              onDelete={selectedOperator ? () => deleteMutation.mutate(selectedOperator.id) : undefined}
            />
          </div>

          {/* Operator Table Section */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Operadores Cadastrados</h2>
            <OperatorTable
              operators={operators || []}
              isLoading={isLoadingOperators}
              onEdit={handleSelectOperator}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          </div>

          {/* Sub-periods and Timeline Section */}
          {selectedOperator && (
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Períodos de Dedicação: <span className="text-accent-orange">{selectedOperator.nome}</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <OperatorPeriods operator={selectedOperator} periods={periods || []} />
                <ShiftTimeline operator={selectedOperator} periods={periods || []} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperatorManagement;