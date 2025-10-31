export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      escala_manual: {
        Row: {
          created_at: string | null
          data: string
          foco: Database["public"]["Enums"]["focus_area"]
          horario_fim: string
          horario_inicio: string
          id: string
          lider_responsavel: string | null
          observacao: string | null
          operador_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          foco: Database["public"]["Enums"]["focus_area"]
          horario_fim: string
          horario_inicio: string
          id?: string
          lider_responsavel?: string | null
          observacao?: string | null
          operador_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          foco?: Database["public"]["Enums"]["focus_area"]
          horario_fim?: string
          horario_inicio?: string
          id?: string
          lider_responsavel?: string | null
          observacao?: string | null
          operador_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escala_manual_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      operadores: {
        Row: {
          ativo: boolean | null
          cor: string
          created_at: string | null
          foco_padrao: Database["public"]["Enums"]["focus_area"]
          id: string
          nome: string
          tipo_turno: Database["public"]["Enums"]["shift_type"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor: string
          created_at?: string | null
          foco_padrao: Database["public"]["Enums"]["focus_area"]
          id?: string
          nome: string
          tipo_turno: Database["public"]["Enums"]["shift_type"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          foco_padrao?: Database["public"]["Enums"]["focus_area"]
          id?: string
          nome?: string
          tipo_turno?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      status_realtime: {
        Row: {
          atualizado_em: string | null
          id: string
          operador_id: string | null
          status: Database["public"]["Enums"]["operator_status"] | null
        }
        Insert: {
          atualizado_em?: string | null
          id?: string
          operador_id?: string | null
          status?: Database["public"]["Enums"]["operator_status"] | null
        }
        Update: {
          atualizado_em?: string | null
          id?: string
          operador_id?: string | null
          status?: Database["public"]["Enums"]["operator_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "status_realtime_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: true
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos_automaticos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          dias_semana: string
          foco: Database["public"]["Enums"]["focus_area"]
          horario_fim: string
          horario_inicio: string
          id: string
          operador_id: string | null
          regra_fim_semana: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          dias_semana: string
          foco: Database["public"]["Enums"]["focus_area"]
          horario_fim: string
          horario_inicio: string
          id?: string
          operador_id?: string | null
          regra_fim_semana?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          dias_semana?: string
          foco?: Database["public"]["Enums"]["focus_area"]
          horario_fim?: string
          horario_inicio?: string
          id?: string
          operador_id?: string | null
          regra_fim_semana?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_automaticos_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      focus_area: "IRIS" | "Situator" | "Apoio"
      operator_status: "Em operação" | "Pausa" | "Fora de turno"
      shift_type: "12x36_diurno" | "12x36_noturno" | "6x18"
      user_role: "admin" | "leader" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      focus_area: ["IRIS", "Situator", "Apoio"],
      operator_status: ["Em operação", "Pausa", "Fora de turno"],
      shift_type: ["12x36_diurno", "12x36_noturno", "6x18"],
      user_role: ["admin", "leader", "viewer"],
    },
  },
} as const
