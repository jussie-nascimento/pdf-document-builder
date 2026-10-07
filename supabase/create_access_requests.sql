-- Criar tabela de solicitações de acesso
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar Row Level Security
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode inserir (para criar solicitações)
CREATE POLICY "Anyone can insert access request"
  ON public.access_requests FOR INSERT
  WITH CHECK (true);

-- Política: apenas usuários autenticados podem ler (admin)
CREATE POLICY "Authenticated users can read access requests"
  ON public.access_requests FOR SELECT
  TO authenticated
  USING (true);

-- Política: apenas usuários autenticados podem atualizar (admin)
CREATE POLICY "Authenticated users can update access requests"
  ON public.access_requests FOR UPDATE
  TO authenticated
  USING (true);
