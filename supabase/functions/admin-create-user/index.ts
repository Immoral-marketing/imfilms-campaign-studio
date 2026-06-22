import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, companyName, contactName, contactPhone, tempPassword } = await req.json()

    if (!email || !companyName || !contactName) {
      throw new Error('email, companyName y contactName son obligatorios')
    }

    // Check if user already exists
    const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.find(u => u.email === email)
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'already_exists', message: 'Ya existe un usuario con ese email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user (confirmed, no OTP needed)
    const createPayload: any = {
      email,
      email_confirm: true,
      user_metadata: {
        company_name: companyName,
        contact_name: contactName,
        contact_phone: contactPhone || '',
      }
    }
    if (tempPassword) createPayload.password = tempPassword

    const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser(createPayload)
    if (createError || !newUser) throw new Error(`Error creando usuario: ${createError?.message}`)

    // Upsert distributor profile
    await supabaseAdmin
      .from('distributors')
      .upsert({
        id: newUser.id,
        company_name: companyName,
        contact_name: contactName,
        contact_phone: contactPhone || '',
        contact_email: email,
      }, { onConflict: 'id' })

    // Ensure distributor_users owner link
    await supabaseAdmin
      .from('distributor_users')
      .upsert({
        distributor_id: newUser.id,
        user_id: newUser.id,
        role: 'owner',
        is_owner: true,
        can_manage_campaigns: true,
        can_receive_reports: true,
        can_manage_billing: true,
        is_active: true,
        pending_approval: false,
      }, { onConflict: 'distributor_id, user_id' })

    // Generate password reset / set-password magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    let magicLink: string | null = null
    if (!linkError && linkData?.properties?.action_link) {
      magicLink = linkData.properties.action_link
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.id, magicLink }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-create-user:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
