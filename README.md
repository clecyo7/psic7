# psic7

Sistema de Gestão de Consultório - Aplicação web para gerenciamento de pacientes, agendamentos, prontuários e finanças.

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

## 📝 Notas Importantes

- ⚠️ **O arquivo `.env` NÃO será commitado no git** (está no `.gitignore`)
- ✅ Use o arquivo `env.example` como referência
- 🔒 Nunca compartilhe suas chaves do Supabase publicamente

## 🗄️ Banco de Dados ⚠️ IMPORTANTE

**ANTES de usar a aplicação, você DEVE criar as tabelas no Supabase!**

### ⚡ Criar Tabelas (OBRIGATÓRIO)

1. Acesse: https://supabase.com/dashboard → Seu Projeto → **SQL Editor**
2. Clique em **New query**
3. Abra o arquivo `supabase/migrations/00_complete_schema.sql`
4. **Copie TODO o conteúdo** e cole no SQL Editor
5. Clique em **Run** (ou `Ctrl+Enter` / `Cmd+Enter`)

**Se você ver o erro:** `Could not find the table 'public.patients'`  
**Significa que as tabelas ainda não foram criadas!** Execute o SQL acima.

Veja instruções detalhadas em: **`CRIAR_TABELAS.md`**

## 📚 Documentação Adicional

- **`CRIAR_TABELAS.md`** ⚠️ - **LEIA PRIMEIRO** - Como criar as tabelas no Supabase
- **`CUSTOS_E_ALTERNATIVAS.md`** 💰 - Análise de custos e alternativas
- `SUPABASE_SETUP.md` - Configuração do Supabase
- `DESABILITAR_CONFIRMACAO_EMAIL.md` - Como desabilitar confirmação de email
- `OTIMIZACOES_CUSTO.md` - Como otimizar para reduzir custos
