import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

        // 1. Verify credentials
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // 2. Verify Requester is Admin
        const { data: roles, error: roleError } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .single();

        if (roleError || !roles) {
            throw new Error("You do not have permission to perform this action")
        }

        // 3. Process Request
        const { email } = await req.json()
        console.log('Promoting user to admin:', email);

        // Find user by email
        const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers()

        if (listError) {
            throw new Error('Error listing users')
        }

        const targetUser = users.find(u => u.email === email)

        if (!targetUser) {
            // User doesn't exist, invite them
            console.log(`User ${email} not found. Sending invitation...`);

            const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
                // Optional: Redirect to admin panel after setting password
                redirectTo: "https://estrenos.imfilms.es/reset-password"
            });

            if (inviteError) {
                return new Response(
                    JSON.stringify({ error: 'Invite failed', message: inviteError.message }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // The user is created immediately upon invitation
            const newUserId = inviteData.user.id;
            console.log(`User invited with ID: ${newUserId}. Assigning admin role...`);

            // Assign role to the new user
            const { error: insertError } = await supabaseClient
                .from("user_roles")
                .insert({
                    user_id: newUserId,
                    role: "admin"
                })

            if (insertError) throw insertError

            return new Response(
                JSON.stringify({ success: true, message: `Invitación enviada a ${email} y permisos de administrador asignados.` }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Check if already admin
        const { data: existingRole } = await supabaseClient
            .from("user_roles")
            .select("*")
            .eq("user_id", targetUser.id)
            .eq("role", "admin")
            .maybeSingle()

        if (existingRole) {
            return new Response(
                JSON.stringify({ error: 'Already admin', message: 'Este usuario ya es administrador.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Assign role
        const { error: insertError } = await supabaseClient
            .from("user_roles")
            .insert({
                user_id: targetUser.id,
                role: "admin"
            })

        if (insertError) throw insertError

        return new Response(
            JSON.stringify({ success: true, message: `Usuario ${email} ahora es administrador` }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
