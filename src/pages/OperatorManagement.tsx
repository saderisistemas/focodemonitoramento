import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const OperatorManagement = () => {
  const navigate = useNavigate();

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
          <h1 className="text-4xl font-bold mb-2">Gestão de Operadores</h1>
          <p className="text-muted-foreground mb-8">
            Crie, edite e gerencie os operadores da central.
          </p>
          {/* Operator management UI will be implemented here */}
          <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">
              A interface de gerenciamento de operadores será construída aqui.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorManagement;