-- System notifications: notificações gerais do sistema

CREATE TABLE public.system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar notificações ativas
CREATE POLICY "Authenticated can view system notifications"
  ON public.system_notifications
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Apenas admin/super_admin pode inserir notificações
CREATE POLICY "Admins can insert system notifications"
  ON public.system_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'super_admin'::user_role)
  );

-- Apenas admin/super_admin pode atualizar
CREATE POLICY "Admins can update system notifications"
  ON public.system_notifications
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'super_admin'::user_role)
  );

-- Apenas admin/super_admin pode deletar
CREATE POLICY "Admins can delete system notifications"
  ON public.system_notifications
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR public.has_role(auth.uid(), 'super_admin'::user_role)
  );

-- Relação para registrar quais notificações cada usuário já marcou como lida
CREATE TABLE public.system_notification_reads (
  notification_id UUID NOT NULL REFERENCES public.system_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

ALTER TABLE public.system_notification_reads ENABLE ROW LEVEL SECURITY;

-- O usuário só visualiza as leituras dele mesmo
CREATE POLICY "Users can view their notification reads"
  ON public.system_notification_reads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- O usuário pode marcar como lida (ou manter) apenas para ele mesmo
CREATE POLICY "Users can insert their notification reads"
  ON public.system_notification_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Permite update para atualizar read_at (caso o upsert gere update)
CREATE POLICY "Users can update their notification reads"
  ON public.system_notification_reads
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_system_notification_reads_user_id ON public.system_notification_reads(user_id);

-- Seed leve: cria 1 notificação inicial se a tabela estiver vazia
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_notifications) THEN
    INSERT INTO public.system_notifications (title, message, kind, is_active)
    VALUES (
      'Bem-vindo ao portal',
      'Você está usando o portal com notificações do sistema. Confira suas mensagens no ícone do sino.',
      'general',
      true
    );
  END IF;
END $$;

