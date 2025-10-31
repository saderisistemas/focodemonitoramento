import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type FocusArea = "IRIS" | "Situator" | "Apoio";

const ManualSchedule = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [operators, setOperators] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    data: "",
    operador_id: "",
    horario_inicio: "",
    horario_fim: "",
    foco: "" as FocusArea,
    lider_responsavel: "",
    observacao: "",
  });

  useState(() => {
    fetchOperators();
  });

  const fetchOperators = async () => {
    const { data } = await supabase
      .from("operadores")
      .select("*")
      .eq("ativo", true)
      .eq("tipo_turno", "6x18");

    if (data) setOperators(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("escala_manual").insert([formData]);

    if (error) {
      toast.error("Erro ao salvar", {
        description: error.message,
      });
    } else {
      toast.success("Escala salva!", {
        description: "Plantão manual registrado com sucesso.",
      });
      setFormData({
        data: "",
        operador_id: "",
        horario_inicio: "",
        horario_fim: "",
        foco: "" as FocusArea,
        lider_responsavel: "",
        observacao: "",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
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
            <Calendar className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Escala Manual - Fim de Semana</h1>
          </div>

          <p className="text-muted-foreground mb-8">
            Registre plantões de operadores 6x18 para sábado e domingo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) =>
                  setFormData({ ...formData, data: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="operador">Operador</Label>
              <Select
                value={formData.operador_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, operador_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o operador" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inicio">Horário Início</Label>
                <Input
                  id="inicio"
                  type="time"
                  value={formData.horario_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, horario_inicio: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="fim">Horário Fim</Label>
                <Input
                  id="fim"
                  type="time"
                  value={formData.horario_fim}
                  onChange={(e) =>
                    setFormData({ ...formData, horario_fim: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="foco">Sistema/Foco</Label>
              <Select
                value={formData.foco}
                onValueChange={(value) =>
                  setFormData({ ...formData, foco: value as FocusArea })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o foco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IRIS">🟠 IRIS</SelectItem>
                  <SelectItem value="Situator">🔵 Situator</SelectItem>
                  <SelectItem value="Apoio">🟢 Apoio/Supervisão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lider">Líder Responsável</Label>
              <Select
                value={formData.lider_responsavel}
                onValueChange={(value) =>
                  setFormData({ ...formData, lider_responsavel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o líder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Danilo">Danilo</SelectItem>
                  <SelectItem value="Angélica">Angélica</SelectItem>
                  <SelectItem value="Alan">Alan</SelectItem>
                  <SelectItem value="Santana">Santana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea
                id="obs"
                value={formData.observacao}
                onChange={(e) =>
                  setFormData({ ...formData, observacao: e.target.value })
                }
                placeholder="Informações adicionais sobre o plantão"
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Escala Manual"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManualSchedule;