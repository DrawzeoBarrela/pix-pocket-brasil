
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MercadoPagoWebhookData {
  id: number
  live_mode: boolean
  type: string
  date_created: string
  application_id: number
  user_id: number
  version: number
  api_version: string
  action: string
  data: {
    id: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Webhook received from Mercado Pago')
    
    const webhookData: MercadoPagoWebhookData = await req.json()
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2))

    // Verificar se é uma notificação de pagamento
    if (webhookData.type !== 'payment') {
      console.log('Webhook is not a payment notification, ignoring')
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const paymentId = webhookData.data.id
    console.log('Processing payment ID:', paymentId)

    // Buscar detalhes do pagamento no Mercado Pago
    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mercadoPagoAccessToken) {
      throw new Error('Token do Mercado Pago não configurado')
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
      },
    })

    if (!paymentResponse.ok) {
      throw new Error(`Erro ao buscar pagamento: ${paymentResponse.status}`)
    }

    const paymentData = await paymentResponse.json()
    console.log('Payment data:', JSON.stringify(paymentData, null, 2))

    // Verificar se o pagamento foi aprovado
    if (paymentData.status !== 'approved') {
      console.log(`Payment status is ${paymentData.status}, not processing`)
      return new Response(JSON.stringify({ status: 'not_approved' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar a operação no banco pelo payment_id do Mercado Pago
    const { data: operation, error: operationError } = await supabase
      .from('operations')
      .select('*, profiles!inner(*)')
      .eq('mercado_pago_payment_id', paymentId)
      .eq('type', 'deposit')
      .single()

    if (operationError) {
      console.error('Error finding operation:', operationError)
      throw new Error(`Operação não encontrada: ${operationError.message}`)
    }

    if (!operation) {
      console.log('No operation found for payment ID:', paymentId)
      return new Response(JSON.stringify({ status: 'operation_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('Found operation:', operation.id)

    // Verificar se a operação já foi confirmada (evitar duplicatas)
    if (operation.status === 'confirmed') {
      console.log('Operation already confirmed, skipping')
      return new Response(JSON.stringify({ status: 'already_confirmed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Atualizar status da operação para confirmado
    const { error: updateError } = await supabase
      .from('operations')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', operation.id)

    if (updateError) {
      console.error('Error updating operation:', updateError)
      throw new Error(`Erro ao atualizar operação: ${updateError.message}`)
    }

    console.log('Operation status updated to confirmed')

    // Enviar notificação do Telegram
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!telegramBotToken) {
      console.error('Telegram Bot token not configured')
    } else {
      try {
        const message = `🟢 *DEPÓSITO CONFIRMADO*\n\n` +
                       `💰 Valor: R$ ${operation.amount.toFixed(2)}\n` +
                       `👤 Usuário: ${operation.profiles.name}\n` +
                       `🎮 PPPoker ID: ${operation.profiles.pppoker_id}\n` +
                       `📊 Status: Confirmado ✅\n` +
                       `🕒 Confirmado em: ${new Date().toLocaleString('pt-BR')}`

        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
        
        const telegramPayload = {
          chat_id: '@Panambipokerfichas',
          text: message,
          parse_mode: 'Markdown'
        }

        const telegramResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(telegramPayload)
        })

        const telegramResult = await telegramResponse.json()
        console.log('Telegram notification sent:', telegramResult)

        if (!telegramResponse.ok) {
          console.error('Telegram API error:', telegramResult)
        }
      } catch (telegramError) {
        console.error('Error sending Telegram notification:', telegramError)
        // Não vamos falhar o webhook por causa da notificação
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento processado e notificação enviada',
        operation_id: operation.id,
        payment_id: paymentId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
