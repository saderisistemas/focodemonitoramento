import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FormLabel } from "@/components/ui/form";

const weekdays = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
];

interface WeekdaySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

const WeekdaySelector = ({ value, onChange }: WeekdaySelectorProps) => {
  return (
    <div>
      <FormLabel>Dias da Semana (Turno Fixo)</FormLabel>
      <ToggleGroup
        type="multiple"
        variant="outline"
        value={value}
        onValueChange={onChange}
        className="mt-2 grid grid-cols-5 gap-2"
      >
        {weekdays.map((day) => (
          <ToggleGroupItem key={day.value} value={day.value} className="w-full">
            {day.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default WeekdaySelector;