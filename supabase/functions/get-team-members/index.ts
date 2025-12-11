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

    const { distributorId } = await req.json()

    console.log('Fetching team members for distributor:', distributorId)

    // Verify user has access to this distributor
    const { data: accessCheck, error: accessError } = await supabaseClient
      .from('distributor_users')
      .select('is_owner')
      .eq('user_id', user.id)
      .eq('distributor_id', distributorId)
      .eq('is_owner', true)
      .single()

    if (accessError || !accessCheck) {
      throw new Error('You must be an owner to view team members')
    }

    // Get all team members
    const { data: members, error: membersError } = await supabaseClient
      .from('distributor_users')
      .select('*')
      .eq('distributor_id', distributorId)
      .order('created_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      throw membersError
    }

    // Get user emails for each member
    const membersWithEmails = await Promise.all(
      (members || []).map(async (member) => {
        try {
          const { data: userData, error: userFetchError } = await supabaseClient.auth.admin.getUserById(member.user_id)
          
          if (userFetchError) {
            console.error('Error fetching user:', member.user_id, userFetchError)
            return {
              ...member,
              user_email: 'Email no disponible'
            }
          }

          return {
            ...member,
            user_email: userData?.user?.email || 'Email no disponible'
          }
        } catch (err) {
          console.error('Error processing member:', member.user_id, err)
          return {
            ...member,
            user_email: 'Email no disponible'
          }
        }
      })
    )

    console.log('Successfully fetched', membersWithEmails.length, 'team members')

    return new Response(
      JSON.stringify({ members: membersWithEmails }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in get-team-members function:', error)
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
