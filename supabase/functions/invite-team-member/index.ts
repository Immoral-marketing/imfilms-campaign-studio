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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { email, distributorId, role } = await req.json()

    console.log('Inviting user:', email, 'to distributor:', distributorId, 'as role:', role)

    // Check if the requesting user is an owner of this distributor
    const { data: ownerCheck, error: ownerError } = await supabaseClient
      .from('distributor_users')
      .select('is_owner')
      .eq('user_id', user.id)
      .eq('distributor_id', distributorId)
      .eq('is_owner', true)
      .single()

    if (ownerError || !ownerCheck) {
      throw new Error('You must be an owner to invite team members')
    }

    // Find the user by email using admin API
    const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      throw new Error('Error searching for user')
    }

    const invitedUser = users?.find(u => u.email === email)

    if (!invitedUser) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found', 
          message: 'Este usuario no está registrado en la plataforma. Deben crear una cuenta primero.' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from('distributor_users')
      .select('*')
      .eq('user_id', invitedUser.id)
      .eq('distributor_id', distributorId)
      .maybeSingle()

    if (existingMember) {
      return new Response(
        JSON.stringify({ 
          error: 'Already member', 
          message: 'Este usuario ya forma parte de tu equipo' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get role permissions
    const getRolePermissions = (role: string) => {
      switch (role) {
        case "owner":
          return {
            is_owner: true,
            can_manage_campaigns: true,
            can_receive_reports: true,
            can_manage_billing: true
          }
        case "marketing":
          return {
            is_owner: false,
            can_manage_campaigns: true,
            can_receive_reports: true,
            can_manage_billing: false
          }
        case "finance":
          return {
            is_owner: false,
            can_manage_campaigns: false,
            can_receive_reports: true,
            can_manage_billing: true
          }
        case "readonly":
          return {
            is_owner: false,
            can_manage_campaigns: false,
            can_receive_reports: false,
            can_manage_billing: false
          }
        default:
          return {
            is_owner: false,
            can_manage_campaigns: true,
            can_receive_reports: true,
            can_manage_billing: false
          }
      }
    }

    const permissions = getRolePermissions(role)

    // Create the invitation
    const { data: newMember, error: insertError } = await supabaseClient
      .from('distributor_users')
      .insert({
        distributor_id: distributorId,
        user_id: invitedUser.id,
        role: role,
        ...permissions,
        pending_approval: false,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting member:', insertError)
      throw insertError
    }

    console.log('Successfully invited user:', email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        member: { ...newMember, user_email: email }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in invite-team-member function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
