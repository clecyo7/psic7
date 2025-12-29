# Psi Cloud - Sistema de Gestão de Consultório

Aplicação web completa para gerenciamento de pacientes, agendamentos, prontuários, relatórios e finanças.

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp env.example .env
   ```

2. Edite o arquivo `.env` e preencha com suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

3. **Onde encontrar as credenciais:**
   - Acesse: https://supabase.com/dashboard
   - Selecione seu projeto
   - Vá em **Settings** → **API**
   - **Project URL**: copie a URL
   - **Project API keys**: copie a chave `anon public`

### 3. Executar o Projeto

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 🗄️ Banco de Dados

### ⚡ Instalação Completa (Recomendado)

1. Acesse: https://supabase.com/dashboard → Seu Projeto → **SQL Editor**
2. Clique em **New query**
3. Abra o arquivo `supabase/migrations/000_INSTALACAO_COMPLETA.sql`
4. **Copie TODO o conteúdo** e cole no SQL Editor
5. Clique em **Run** (ou `Ctrl+Enter` / `Cmd+Enter`)

Este arquivo cria todas as tabelas, índices, funções, triggers e políticas RLS necessárias.

### ⚠️ Reset Completo (Se necessário)

Se precisar recriar tudo do zero:

1. Abra `supabase/migrations/999_RESET_COMPLETO.sql`
2. Execute no SQL Editor do Supabase

**ATENÇÃO:** Isso vai DELETAR TODOS OS DADOS!

## 👤 Criar Primeiro Super Admin

### Método 1: Via SQL (Recomendado)

1. **Criar usuário no Supabase Auth:**
   - Acesse: **Authentication** → **Users** → **Add user**
   - Preencha email e senha
   - Marque **"Auto Confirm User"**
   - Clique em **"Create user"**
   - **Copie o UUID** do usuário criado

2. **Criar profissional e tornar super admin:**
   - Vá em **SQL Editor**
   - Execute (substitua os valores):

```sql
INSERT INTO professionals (
  user_id,
  name,
  email,
  active,
  is_super_admin
) VALUES (
  'SEU_USER_ID_AQUI',  -- UUID copiado acima
  'Nome do Super Admin',
  'admin@consultorio.com',
  true,
  true   -- Super Admin ✅
);
```

3. **Verificar:**
   - Faça logout e login novamente
   - O menu **"Administração"** deve aparecer

### Método 2: Tornar Profissional Existente em Super Admin

```sql
-- Encontrar o user_id do profissional
SELECT id, name, email, user_id 
FROM professionals 
WHERE email = 'email@exemplo.com';

-- Tornar super admin (substitua o user_id)
UPDATE professionals 
SET is_super_admin = true,
    active = true
WHERE user_id = 'SEU_USER_ID_AQUI';
```

## 🔧 Edge Functions (Criar Usuários com Senha)

Para que super admins possam criar usuários com senha, é necessário fazer deploy das Edge Functions:

### Instalar Supabase CLI

**Opção 1: Homebrew (macOS)**
```bash
brew install supabase/tap/supabase
```

**Opção 2: Usar npx (sem instalação)**
```bash
npx supabase --version
```

### Deploy das Funções

1. **Fazer login:**
   ```bash
   supabase login
   ```

2. **Vincular ao projeto:**
   ```bash
   supabase link --project-ref seu-project-ref
   ```
   (Encontre o `project-ref` em: Settings → General → Reference ID)

3. **Deploy:**
   ```bash
   supabase functions deploy create-user
   supabase functions deploy update-user-password
   ```

**Alternativa:** Criar as funções diretamente no Dashboard do Supabase:
- Vá em **Edge Functions** → **Create a new function**
- Nome: `create-user`
- Cole o código de `supabase/functions/create-user/index.ts`
- Repita para `update-user-password`

## ⚙️ Configurações do Supabase

### Desabilitar Confirmação de Email (Desenvolvimento)

1. Acesse: **Authentication** → **Settings**
2. Role até **Email Auth**
3. **Desmarque** "Enable email confirmations"
4. Clique em **Save**

### Configurar URL de Redirecionamento

Se manter confirmação de email ativada:

1. Vá em **Authentication** → **URL Configuration**
2. Adicione em **Redirect URLs**:
   - Desenvolvimento: `http://localhost:5173`
   - Produção: sua URL de produção

## 📋 Funcionalidades

### Para Super Admin:
- ✅ Ver todos os pacientes, agendamentos, prontuários e relatórios
- ✅ Criar e gerenciar usuários e profissionais
- ✅ Definir profissional responsável por paciente
- ✅ Acessar painel administrativo completo

### Para Profissionais:
- ✅ Gerenciar seus próprios pacientes
- ✅ Criar e gerenciar agendamentos
- ✅ Criar prontuários e relatórios
- ✅ Gerenciar finanças
- ✅ Ver apenas dados vinculados a eles

## 🔒 Segurança

- **Row Level Security (RLS)** habilitado em todas as tabelas
- **Super admins** têm acesso total via função `is_super_admin()`
- **Profissionais** veem apenas seus próprios dados
- **Edge Functions** usam Service Role Key no servidor (nunca exposta ao cliente)

## 📚 Estrutura do Banco de Dados

### Tabelas Principais:
- `professionals` - Profissionais do sistema
- `patients` - Pacientes (vinculados a profissionais)
- `appointments` - Agendamentos
- `medical_records` - Prontuários
- `reports` - Relatórios customizados
- `financial_transactions` - Transações financeiras
- `consultation_prices` - Preços de consulta
- `appointment_confirmations` - Confirmações de agendamento

### Funções Importantes:
- `is_super_admin(user_uuid)` - Verifica se usuário é super admin
- `activate_daily_appointments()` - Rotina diária de agendamentos
- `check_appointment_conflict()` - Valida conflitos de agenda

## 🛠️ Desenvolvimento

### Tecnologias:
- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **PDF:** jsPDF para geração de relatórios

### Scripts Disponíveis:
```bash
npm run dev      # Desenvolvimento
npm run build    # Build para produção
npm run preview  # Preview do build
```

## 📝 Notas Importantes

- ⚠️ **O arquivo `.env` NÃO será commitado no git** (está no `.gitignore`)
- ✅ Use o arquivo `env.example` como referência
- 🔒 Nunca compartilhe suas chaves do Supabase publicamente
- 📦 As migrações com timestamp devem ser mantidas para histórico
- 🗑️ Arquivos de diagnóstico/teste foram removidos (veja `ARQUIVOS_PARA_REMOVER.md`)

## 🐛 Troubleshooting

### Erro: "Could not find the table 'public.patients'"
Execute o arquivo `000_INSTALACAO_COMPLETA.sql` no SQL Editor.

### Erro: "E-mail não confirmado"
Desabilite confirmação de email ou configure URL de redirecionamento (veja seção acima).

### Erro: "Only super admins can create users"
Verifique se você está logado como super admin. Execute o SQL para tornar-se super admin.

### Erro: "Function not found" (Edge Functions)
Faça deploy das Edge Functions (veja seção Edge Functions acima).

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no console do navegador (F12)
2. Verifique os logs no Supabase Dashboard
3. Execute queries de diagnóstico no SQL Editor

---

**Desenvolvido com ❤️ para gestão de consultórios**
