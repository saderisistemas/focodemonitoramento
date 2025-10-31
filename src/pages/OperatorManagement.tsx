import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OperatorForm from "@/components/OperatorForm";
import OperatorTable from "@/components/OperatorTable";
import { Tables } from "@/integrations/supabase/types";

export type Operator = Tables<"operadores">;

const OperatorManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);

  // Fetch operators
  const { data: operators, isLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operadores")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Create/Update mutation
  const upsertMutation = useMutation({
    mutationFn: async (operatorData: Omit<Operator, "id" | "created_at" | "updated_at"> & { id?: string }) => {
      const { error } = await supabase.from("operadores").upsert(operatorData);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success(selectedOperator ? "Operador atualizado!" : "Operador criado com sucesso!");
      setIsDialogOpen(false);
      setSelectedOperator(null);
    },
    onError: (error) => {
      toast.error("Erro ao salvar operador", { description: error.message });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operadores").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast.success("Operador excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir operador", { description: error.message });
    },
  });

  const handleEdit = (operator: Operator) => {
    setSelectedOperator(operator);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedOperator(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="bg-card rounded-2xl p-8 border border-border">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Gestão de Operadores</h1>
              <p className="text-muted-foreground">
                Crie, edite e gerencie os operadores da central.
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" onClick={handleAddNew} style={{ backgroundColor: '#FF8800' }}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Novo Operador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {selectedOperator ? "Editar Operador" : "Criar Novo Operador"}
                  </DialogTitle>
                </DialogHeader>
                <OperatorForm
                  key={selectedOperator?.id || 'new'}
                  initialData={selectedOperator}
                  onSubmit={(data) => upsertMutation.mutate(data)}
                  isLoading={upsertMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          <OperatorTable
            operators={operators || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </div>
      </div>
    </div>
  );
};

export default OperatorManagement;