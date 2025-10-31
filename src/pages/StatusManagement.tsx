import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type OperatorStatus = "Em operação" | "Pausa" | "Fora de turno";

interface Operator {
  id: string;
  nome: string;
  cargo: string;
  status?: OperatorStatus;
}

const StatusManagement = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    const { data: operatorsData } = await supabase
      .from("operadores")
      .select("*")
      .eq("ativo", true);

    if (operatorsData) {
      const { data: statusData } = await supabase
        .from("status_realtime")
        .select("*");

      const operatorsWithStatus = operatorsData.map((op) => ({
        ...op,
        status:
          statusData?.find((s) => s.operador_id === op.id)?.status ||
          "Fora de turno",
      }));

      setOperators(operatorsWithStatus as Operator[]);
    }
  };

  const updateStatus = async (operatorId: string, newStatus: OperatorStatus) => {
    setLoading(operatorId);

    const { error } = await supabase
      .from("status_realtime")
      .upsert({
        operador_id: operatorId,
        status: newStatus,
        atualizado_em: new Date().toISOString(),
      });

    if (error) {
      toast.error("Erro ao atualizar", {
        description: error.message,
      });
    } else {
      toast.success("Status atualizado!", {
        description: "Alteração refletida no painel TV.",
      });
      fetchOperators();
    }

    setLoading(null);
  };

  const getStatusBadge = (status?: OperatorStatus) => {
    switch (status) {
      case "Em operação":
        return "bg-[hsl(var(--status-active))] text-white";
      case "Pausa":
        return "bg-[hsl(var(--status-pause))] text-black";
      default:
        return "bg-[hsl(var(--status-off))] text-white";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Painel
        </Button>

        <div className="bg-card rounded-2xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Gestão de Status</h1>
          </div>

          <p className="text-muted-foreground mb-8">
            Atualize o status dos operadores em tempo real.
          </p>

          <div className="space-y-4">
            {operators.map((operator) => (
              <div
                key={operator.id}
                className="flex items-center justify-between p-6 bg-secondary rounded-xl border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold">{operator.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {operator.cargo}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                      operator.status
                    )}`}
                  >
                    {operator.status}
                  </span>
                </div>

                <Select
                  value={operator.status}
                  onValueChange={(value) =>
                    updateStatus(operator.id, value as OperatorStatus)
                  }
                  disabled={loading === operator.id}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em operação">
                      🟢 Em operação
                    </SelectItem>
                    <SelectItem value="Pausa">🟡 Pausa</SelectItem>
                    <SelectItem value="Fora de turno">
                      🔴 Fora de turno
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusManagement;