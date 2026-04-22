import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verificar que el llamante está autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente admin con service_role (bypasa RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Verificar que el llamante es super_admin_afiliados
    const { data: isSA } = await adminClient
      .from('super_admins_afiliados')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!isSA) {
      return new Response(JSON.stringify({ error: 'Acceso denegado: no eres super admin de afiliados' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Leer datos del nuevo partner
    const { nombre, email, slug } = await req.json()

    if (!nombre || !email || !slug) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos: nombre, email, slug' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar que el slug no esté en uso
    const { data: existingSlug } = await adminClient
      .from('partners')
      .select('id')
      .eq('slug', slug.toLowerCase().trim())
      .single()

    if (existingSlug) {
      return new Response(JSON.stringify({ error: `El slug "${slug}" ya está en uso` }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Invitar al usuario — Supabase envía email automático con link para establecer contraseña
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://imfilms.es'
    const { data: newUser, error: createError } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${siteUrl}/afiliado`,
        data: { nombre: nombre.trim(), slug: slug.toLowerCase().trim() },
      }
    )

    if (createError || !newUser.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Error al enviar la invitación' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insertar en partners
    const { data: partner, error: partnerError } = await adminClient
      .from('partners')
      .insert({
        user_id: newUser.user.id,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        slug: slug.toLowerCase().trim(),
        activo: true,
      })
      .select()
      .single()

    if (partnerError) {
      // Rollback: eliminar el usuario Auth recién creado
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return new Response(JSON.stringify({ error: partnerError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, partner }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
