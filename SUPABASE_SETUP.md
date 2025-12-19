# Configuração do Supabase - Solução para Login

## Problema: "E-mail não confirmado"

Se você está recebendo o erro "E-mail não confirmado" ao tentar fazer login, há duas soluções:

## Solução 1: Desabilitar Confirmação de Email (Recomendado para Desenvolvimento)

Esta é a solução mais rápida para desenvolvimento:

1. Acesse o **Dashboard do Supabase**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Settings** (no menu lateral)
4. Role até a seção **Email Auth**
5. Desabilite a opção **"Enable email confirmations"**
6. Clique em **Save**

Agora você poderá fazer login sem precisar confirmar o email.

## ⚠️ IMPORTANTE: Configurar URL de Redirecionamento

Se você optar por manter a confirmação de email ativada, **é essencial configurar a URL de redirecionamento correta**:

1. Acesse **Authentication** → **URL Configuration** no Dashboard do Supabase
2. Na seção **Redirect URLs**, adicione:
   - Para desenvolvimento: `http://localhost:5173`
   - Para produção: sua URL de produção (ex: `https://seudominio.com`)
3. Clique em **Save**

**Por que isso é importante?**
- Sem essa configuração, o link de confirmação pode redirecionar para `localhost:3000` (padrão)
- Sua aplicação está rodando em `localhost:5173` (Vite)
- O código já está configurado para usar a URL correta automaticamente

## Solução 2: Confirmar o Email

Se preferir manter a confirmação de email ativada:

1. Verifique sua caixa de entrada (e spam) do email cadastrado
2. Procure por um email do Supabase com o assunto "Confirm your signup"
3. Clique no link de confirmação
4. Tente fazer login novamente

### Reenviar Email de Confirmação

Se você não recebeu o email ou ele expirou:

1. No formulário de login, quando aparecer o erro "E-mail não confirmado"
2. Clique no botão **"Reenviar e-mail de confirmação"**
3. Verifique sua caixa de entrada novamente

## Criar Novo Usuário

Se você ainda não tem uma conta:

1. No formulário de login, clique em **"Não tem conta? Criar"**
2. Preencha email e senha
3. Se a confirmação de email estiver desabilitada, você poderá fazer login imediatamente
4. Se estiver habilitada, você receberá um email de confirmação

## Verificar Usuários Existentes

Para ver os usuários cadastrados no Supabase:

1. Acesse **Authentication** → **Users** no Dashboard
2. Você verá todos os usuários cadastrados
3. Pode confirmar manualmente um usuário clicando nos três pontos ao lado do email e selecionando "Confirm email"

