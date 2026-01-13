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
                auth: { error: undefined } // Just to be safe with auth handling
            }
        )

        // Parse body
        const {
            userId,
            filmData,
            campaignData,
            platforms,
            addons,
            contactData,
            distributorData,
            notifyAdmin
        } = await req.json()

        if (!userId) throw new Error('Missing userId');

        console.log(`Processing submission for user ${userId}`);

        // 1. Ensure Distributor Profile uses correct data
        // For unconfirmed users, triggers might have fired but we want to be sure
        // We can update the distributor record to match the wizard data exactly
        const { error: distError } = await supabaseClient
            .from('distributors')
            .update({
                company_name: contactData.companyName,
                contact_name: contactData.contactName,
                contact_phone: contactData.contactPhone,
                contact_email: contactData.contactEmail
            })
            .eq('id', userId);

        if (distError) {
            console.error('Error updating distributor:', distError);
            // Don't fail hard here, user might have been created correctly
        }

        // 2. Ensure Distributor User link exists (critical for RLS later when they do log in)
        const { error: userLinkError } = await supabaseClient
            .from('distributor_users')
            .upsert({
                distributor_id: userId,
                user_id: userId,
                role: 'owner',
                is_owner: true,
                can_receive_reports: true,
                can_manage_campaigns: true,
                can_manage_billing: true,
                is_active: true
            }, { onConflict: 'distributor_id, user_id' });

        if (userLinkError) console.error('Error linking user:', userLinkError);

        // 3. Create Film
        const { data: filmRecord, error: filmError } = await supabaseClient
            .from("films")
            .insert({
                distributor_id: userId,
                title: filmData.title,
                genre: filmData.genre,
                country: filmData.country,
                distributor_name: filmData.distributorName,
                target_audience_text: filmData.targetAudience,
                main_goals: filmData.goals,
                release_date: campaignData.releaseDate,
            })
            .select()
            .single();

        if (filmError) throw new Error(`Error creating film: ${filmError.message}`);

        // 4. Create Campaign
        const { data: campaignRecord, error: campaignError } = await supabaseClient
            .from("campaigns")
            .insert({
                distributor_id: userId,
                film_id: filmRecord.id,
                pre_start_date: campaignData.preStartDate,
                pre_end_date: campaignData.preEndDate,
                premiere_weekend_start: campaignData.premiereWeekendStart,
                premiere_weekend_end: campaignData.premiereWeekendEnd,
                final_report_date: campaignData.finalReportDate,
                creatives_deadline: campaignData.creativesDeadline,
                ad_investment_amount: campaignData.adInvestment,
                fixed_fee_amount: campaignData.fixedFee,
                variable_fee_amount: campaignData.variableFee,
                setup_fee_amount: campaignData.setupFee,
                addons_base_amount: campaignData.addonsCost,
                total_estimated_amount: campaignData.totalEstimated,
                is_first_release: campaignData.isFirstRelease,
                contact_name: contactData.contactName,
                contact_email: contactData.contactEmail,
                contact_phone: contactData.contactPhone,
                additional_comments: contactData.comments,
                status: "nuevo",
            })
            .select()
            .single();

        if (campaignError) throw new Error(`Error creating campaign: ${campaignError.message}`);

        // 5. Add Platforms
        if (platforms && platforms.length > 0) {
            const platformRecords = platforms.map((p: string) => ({
                campaign_id: campaignRecord.id,
                platform_name: p
            }));
            const { error: platError } = await supabaseClient
                .from('campaign_platforms')
                .insert(platformRecords);

            if (platError) console.error('Error adding platforms:', platError);
        }

        // 6. Add Addons
        if (addons && addons.length > 0) {
            const addonRecords = addons.map((a: string) => ({
                campaign_id: campaignRecord.id,
                addon_type: a
            }));
            const { error: addonError } = await supabaseClient
                .from('campaign_addons')
                .insert(addonRecords);

            if (addonError) console.error('Error adding addons:', addonError);
        }

        // 7. Send Notification Email (if requested)
        if (notifyAdmin) {
            try {
                // Call send-email function
                // internal call or direct fetch if internal not supported easily in same project context
                // effectively we just want to trigger the logic.
                // For simplicity, we can let the FRONTEND trigger the email or do it here.
                // Ideally here to be robust. 

                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'new_campaign',
                        campaignId: campaignRecord.id,
                        campaignTitle: filmData.title,
                        distributorName: filmData.distributorName,
                        recipientEmail: contactData.contactEmail
                    })
                });

            } catch (emailErr) {
                console.error('Failed to send email notification:', emailErr);
            }
        }

        return new Response(
            JSON.stringify({ success: true, campaignId: campaignRecord.id }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )

    } catch (error) {
        console.error('Submit Campaign Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
