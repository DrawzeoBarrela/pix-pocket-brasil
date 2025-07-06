
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
    console.log('=== WEBHOOK RECEBIDO ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Parse URL to get query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    console.log('Query Parameters:', queryParams)

    let webhookData: MercadoPagoWebhookData
    
    // Try to get data from query parameters first (for Mercado Pago test)
    if (queryParams['data.id'] && queryParams['type']) {
      console.log('📥 Dados recebidos via query parameters (teste do Mercado Pago)')
      webhookData = {
        id: parseInt(queryParams.id) || 0,
        live_mode: queryParams.live_mode === 'true',
        type: queryParams.type,
        date_created: queryParams.date_created || new Date().toISOString(),
        application_id: parseInt(queryParams.application_id) || 0,
        user_id: parseInt(queryParams.user_id) || 0,
        version: parseInt(queryParams.version) || 1,
        api_version: queryParams.api_version || 'v1',
        action: queryParams.action || 'payment.updated',
        data: {
          id: queryParams['data.id']
        }
      }
    } else {
      // Try to get data from JSON body (for real webhook)
      console.log('📥 Tentando obter dados via JSON body (webhook real)')
      try {
        webhookData = await req.json()
      } catch (jsonError) {
        console.error('❌ Erro ao fazer parse do JSON:', jsonError)
        // If both query params and JSON parsing fail, return error
        if (!queryParams['data.id']) {
          throw new Error('Dados não encontrados nem em query parameters nem em JSON body')
        }
      }
    }

    console.log('=== DADOS DO WEBHOOK ===')
    console.log(JSON.stringify(webhookData, null, 2))

    // Verificar se é uma notificação de pagamento
    if (webhookData.type !== 'payment') {
      console.log('❌ Webhook ignorado - não é notificação de pagamento, tipo:', webhookData.type)
      return new Response(JSON.stringify({ status: 'ignored', reason: 'not_payment' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const paymentId = webhookData.data.id
    console.log('💰 Processando pagamento ID:', paymentId)

    // Se for apenas um teste do Mercado Pago (sem payment ID real), retornar sucesso
    if (paymentId === '123456' || !paymentId) {
      console.log('🧪 Teste do Mercado Pago detectado - retornando sucesso')
      return new Response(JSON.stringify({ status: 'test_success', message: 'Webhook test successful' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Validar assinatura webhook do Mercado Pago (se fornecida)
    const signature = req.headers.get('x-signature')
    const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')
    
    if (signature && webhookSecret) {
      console.log('🔐 Validando assinatura do webhook...')
      const expectedSignature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(webhookData) + webhookSecret)
      )
      const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      if (!signature.includes(expectedSignatureHex)) {
        console.error('❌ Assinatura inválida do webhook')
        throw new Error('Assinatura inválida do webhook')
      }
      console.log('✅ Assinatura do webhook validada')
    } else if (signature) {
      console.log('⚠️ Assinatura recebida mas secret não configurado')
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mercadoPagoAccessToken) {
      console.error('❌ Token do Mercado Pago não configurado')
      throw new Error('Token do Mercado Pago não configurado')
    }

    console.log('🔍 Buscando detalhes do pagamento no Mercado Pago...')
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
      },
    })

    if (!paymentResponse.ok) {
      console.error('❌ Erro ao buscar pagamento:', paymentResponse.status, paymentResponse.statusText)
      const errorText = await paymentResponse.text()
      console.error('Resposta do erro:', errorText)
      throw new Error(`Erro ao buscar pagamento: ${paymentResponse.status}`)
    }

    const paymentData = await paymentResponse.json()
    console.log('=== DADOS DO PAGAMENTO ===')
    console.log(JSON.stringify(paymentData, null, 2))

    // Verificar se o pagamento foi aprovado
    if (paymentData.status !== 'approved') {
      console.log(`⏳ Status do pagamento: ${paymentData.status} - não processando ainda`)
      return new Response(JSON.stringify({ status: 'not_approved', payment_status: paymentData.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('✅ Pagamento aprovado! Processando...')

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Buscando operação no banco de dados...')
    // Buscar a operação no banco pelo payment_id do Mercado Pago
    const { data: operation, error: operationError } = await supabase
      .from('operations')
      .select('*, profiles!inner(*)')
      .eq('mercado_pago_payment_id', paymentId)
      .eq('type', 'deposit')
      .single()

    if (operationError) {
      console.error('❌ Erro ao buscar operação:', operationError)
      
      // Tentar buscar sem o inner join para debug
      const { data: allOps, error: debugError } = await supabase
        .from('operations')
        .select('*')
        .eq('mercado_pago_payment_id', paymentId)
        
      console.log('🔍 Debug - operações encontradas:', allOps)
      console.log('🔍 Debug - erro:', debugError)
      
      throw new Error(`Operação não encontrada: ${operationError.message}`)
    }

    if (!operation) {
      console.log('❌ Nenhuma operação encontrada para payment ID:', paymentId)
      
      // Debug: buscar todas as operações recentes
      const { data: recentOps } = await supabase
        .from('operations')
        .select('id, mercado_pago_payment_id, created_at')
        .eq('type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(5)
        
      console.log('🔍 Últimas 5 operações de depósito:', recentOps)
      
      return new Response(JSON.stringify({ status: 'operation_not_found', payment_id: paymentId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('✅ Operação encontrada:', operation.id)
    console.log('👤 Usuário:', operation.profiles.name)
    console.log('🎮 PPPoker ID:', operation.profiles.pppoker_id)

    // Verificar se a operação já foi confirmada (evitar duplicatas)
    if (operation.status === 'confirmed') {
      console.log('⚠️ Operação já confirmada anteriormente')
      return new Response(JSON.stringify({ status: 'already_confirmed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('💾 Atualizando status da operação para confirmado...')
    // Atualizar status da operação para confirmado
    const { error: updateError } = await supabase
      .from('operations')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', operation.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar operação:', updateError)
      throw new Error(`Erro ao atualizar operação: ${updateError.message}`)
    }

    console.log('✅ Status da operação atualizado para confirmado')

    // Enviar notificação do Telegram
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!telegramBotToken) {
      console.error('❌ Token do Telegram não configurado')
      throw new Error('Token do Telegram não configurado')
    }

    console.log('📱 Enviando notificação do Telegram...')
    
    try {
      const message = `🟢 *DEPÓSITO CONFIRMADO*\n\n` +
                     `💰 Valor: R$ ${operation.amount.toFixed(2)}\n` +
                     `👤 Usuário: ${operation.profiles.name}\n` +
                     `🎮 PPPoker ID: ${operation.profiles.pppoker_id}\n` +
                     `📊 Status: Confirmado ✅\n` +
                     `🕒 Confirmado em: ${new Date().toLocaleString('pt-BR')}\n` +
                     `🆔 Payment ID: ${paymentId}`

      console.log('📝 Mensagem do Telegram:', message)

      const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
      
      const telegramPayload = {
        chat_id: '@Panambipokerfichas',
        text: message,
        parse_mode: 'Markdown'
      }

      console.log('📤 Enviando para Telegram:', telegramUrl)
      console.log('📦 Payload:', JSON.stringify(telegramPayload, null, 2))

      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(telegramPayload)
      })

      const telegramResult = await telegramResponse.json()
      console.log('📱 Resposta do Telegram:', JSON.stringify(telegramResult, null, 2))

      if (!telegramResponse.ok) {
        console.error('❌ Erro na API do Telegram:', telegramResult)
        throw new Error(`Erro do Telegram: ${telegramResult.description || 'Erro desconhecido'}`)
      }

      console.log('✅ Notificação do Telegram enviada com sucesso!')
      
    } catch (telegramError) {
      console.error('❌ Erro ao enviar notificação do Telegram:', telegramError)
      // Não vamos falhar o webhook por causa da notificação, mas vamos logar o erro
    }

    console.log('🎉 Processamento do webhook concluído com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento processado e notificação enviada',
        operation_id: operation.id,
        payment_id: paymentId,
        user_name: operation.profiles.name,
        amount: operation.amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 ERRO GERAL no processamento do webhook:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
