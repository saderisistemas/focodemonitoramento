import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2 } from "lucide-react";
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

interface OperatorTableProps {
  operators: Operator[];
  isLoading: boolean;
  onEdit: (operator: Operator) => void;
  onDelete: (id: string) => void;
}

const OperatorTable = ({ operators, isLoading, onEdit, onDelete }: OperatorTableProps) => {
  const getFocusColor = (focus: string) => {
    switch (focus) {
      case "IRIS": return "bg-iris text-white";
      case "Situator": return "bg-situator text-white";
      case "Apoio": return "bg-apoio text-white";
      default: return "bg-secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo de Turno</TableHead>
            <TableHead>Foco Padrão</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operators.map((op) => (
            <TableRow key={op.id}>
              <TableCell className="font-medium">{op.nome}</TableCell>
              <TableCell>{op.tipo_turno.replace("_", " ").toUpperCase()}</TableCell>
              <TableCell>
                <Badge className={getFocusColor(op.foco_padrao)}>{op.foco_padrao}</Badge>
              </TableCell>
              <TableCell>{op.horário_inicio} - {op.horário_fim}</TableCell>
              <TableCell>
                <Badge variant={op.ativo ? "default" : "destructive"}>
                  {op.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => onEdit(op)} style={{ color: '#0099FF', borderColor: '#0099FF' }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o operador e todos os seus dados associados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(op.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OperatorTable;