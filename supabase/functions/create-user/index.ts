import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar se é super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Criar cliente com anon key para verificar o usuário
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verificar se o usuário é super admin
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Verificar se é super admin
    const { data: professional, error: profError } = await supabaseClient
      .from('professionals')
      .select('is_super_admin, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (profError || !professional?.is_super_admin) {
      throw new Error('Only super admins can create users')
    }

    // Criar cliente com service role key para criar usuário
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { email, password, name, registration_number, specialization, phone, is_super_admin } = await req.json()

    if (!email || !password || !name) {
      throw new Error('Email, password and name are required')
    }

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
    })

    if (authError) throw authError

    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    // Criar profissional
    const { error: professionalError } = await supabaseAdmin
      .from('professionals')
      .insert({
        user_id: authData.user.id,
        name: name.trim(),
        registration_number: registration_number?.trim() || null,
        specialization: specialization?.trim() || null,
        email: email.trim(),
        phone: phone?.trim() || null,
        is_super_admin: is_super_admin || false,
        active: true,
      })

    if (professionalError) throw professionalError

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})


