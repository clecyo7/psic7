// API Route para Vercel - Executa a rotina diária de agendamentos
// Este arquivo deve estar na pasta /api/ na raiz do projeto

export default async function handler(req, res) {
  // Verificar se é uma requisição autorizada (da Vercel Cron)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'seu-secret-aqui-mude-isso';
  
  // Se não tiver o header correto, negar acesso
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // Chamar a função do Supabase diretamente
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    // Fazer chamada HTTP direta ao Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/activate_daily_appointments`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao executar rotina: ${error}`);
    }

    const result = await response.json();

    return res.status(200).json({
      success: true,
      message: 'Rotina diária executada com sucesso',
      resultado: {
        ativados: result[0]?.activated_count || 0,
        expirados: result[0]?.expired_count || 0,
        notificacoes: result[0]?.notifications_sent || 0,
      },
    });
  } catch (error) {
    console.error('Erro na rotina diária:', error);
    return res.status(500).json({
      error: 'Erro ao executar rotina diária',
      detalhes: error.message,
    });
  }
}



