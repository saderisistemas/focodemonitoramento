-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for shift types
CREATE TYPE shift_type AS ENUM ('12x36_diurno', '12x36_noturno', '6x18');

-- Create enum for focus areas
CREATE TYPE focus_area AS ENUM ('IRIS', 'Situator', 'Apoio');

-- Create enum for status
CREATE TYPE operator_status AS ENUM ('Em operação', 'Pausa', 'Fora de turno');

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'leader', 'viewer');

-- Table: operadores
CREATE TABLE public.operadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  tipo_turno shift_type NOT NULL,
  foco_padrao focus_area NOT NULL,
  cor TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: turnos_automaticos
CREATE TABLE public.turnos_automaticos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operador_id UUID REFERENCES public.operadores(id) ON DELETE CASCADE,
  dias_semana TEXT NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  foco focus_area NOT NULL,
  regra_fim_semana TEXT DEFAULT 'ativo',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: escala_manual
CREATE TABLE public.escala_manual (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data DATE NOT NULL,
  operador_id UUID REFERENCES public.operadores(id) ON DELETE CASCADE,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  foco focus_area NOT NULL,
  lider_responsavel TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: status_realtime
CREATE TABLE public.status_realtime (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operador_id UUID REFERENCES public.operadores(id) ON DELETE CASCADE UNIQUE,
  status operator_status DEFAULT 'Fora de turno',
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: user_roles (for authentication)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos_automaticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_realtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for operadores (public read, admin/leader write)
CREATE POLICY "Anyone can view operadores"
  ON public.operadores FOR SELECT
  USING (true);

CREATE POLICY "Admin and leaders can insert operadores"
  ON public.operadores FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'leader')
  );

CREATE POLICY "Admin and leaders can update operadores"
  ON public.operadores FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'leader')
  );

CREATE POLICY "Only admin can delete operadores"
  ON public.operadores FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for turnos_automaticos
CREATE POLICY "Anyone can view turnos_automaticos"
  ON public.turnos_automaticos FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage turnos_automaticos"
  ON public.turnos_automaticos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for escala_manual
CREATE POLICY "Anyone can view escala_manual"
  ON public.escala_manual FOR SELECT
  USING (true);

CREATE POLICY "Admin and leaders can manage escala_manual"
  ON public.escala_manual FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'leader')
  );

-- RLS Policies for status_realtime
CREATE POLICY "Anyone can view status_realtime"
  ON public.status_realtime FOR SELECT
  USING (true);

CREATE POLICY "Admin and leaders can update status_realtime"
  ON public.status_realtime FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'leader')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_operadores_ativo ON public.operadores(ativo);
CREATE INDEX idx_turnos_automaticos_operador ON public.turnos_automaticos(operador_id);
CREATE INDEX idx_escala_manual_data ON public.escala_manual(data);
CREATE INDEX idx_status_realtime_operador ON public.status_realtime(operador_id);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.operadores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.turnos_automaticos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escala_manual;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_realtime;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_operadores_updated_at
  BEFORE UPDATE ON public.operadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_turnos_automaticos_updated_at
  BEFORE UPDATE ON public.turnos_automaticos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escala_manual_updated_at
  BEFORE UPDATE ON public.escala_manual
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for testing
INSERT INTO public.operadores (nome, tipo_turno, foco_padrao, cor) VALUES
  ('Operador 1', '12x36_diurno', 'IRIS', '#FF8800'),
  ('Operador 2', '12x36_noturno', 'Situator', '#0099FF'),
  ('Operador 3', '6x18', 'Apoio', '#00CC66');

-- Initialize status for sample operators
INSERT INTO public.status_realtime (operador_id, status)
SELECT id, 'Fora de turno' FROM public.operadores;