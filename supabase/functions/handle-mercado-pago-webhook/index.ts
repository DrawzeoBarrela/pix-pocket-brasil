
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MercadoPagoWebhookData {
  id?: number
  live_mode?: boolean
  type?: string
  topic?: string // Alternative to type
  date_created?: string
  application_id?: number
  user_id?: number
  version?: number
  api_version?: string
  action?: string
  data?: {
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
    let paymentId: string
    
    // Try multiple methods to extract webhook data
    console.log('🔍 Analisando dados do webhook...')
    
    // Method 1: Query parameters (common in Mercado Pago notifications)
    if (queryParams['data.id'] || queryParams['id']) {
      console.log('📥 Dados detectados via query parameters')
      paymentId = queryParams['data.id'] || queryParams['id']
      webhookData = {
        id: parseInt(queryParams.id) || 0,
        live_mode: queryParams.live_mode === 'true',
        type: queryParams.type || queryParams.topic || 'payment',
        date_created: queryParams.date_created || new Date().toISOString(),
        application_id: parseInt(queryParams.application_id) || 0,
        user_id: parseInt(queryParams.user_id) || 0,
        version: parseInt(queryParams.version) || 1,
        api_version: queryParams.api_version || 'v1',
        action: queryParams.action || 'payment.updated',
        data: {
          id: paymentId
        }
      }
      console.log('✅ Payment ID extraído dos query params:', paymentId)
    } else {
      // Method 2: JSON body (alternative webhook format)
      console.log('📥 Tentando obter dados via JSON body')
      try {
        const bodyData = await req.json()
        console.log('📋 Dados do JSON body:', JSON.stringify(bodyData, null, 2))
        
        webhookData = bodyData
        // Extract payment ID from various possible locations
        paymentId = bodyData?.data?.id || bodyData?.id || bodyData?.payment_id
        
        if (!paymentId) {
          console.error('❌ Payment ID não encontrado no JSON body')
          throw new Error('Payment ID não encontrado nos dados do webhook')
        }
        
        console.log('✅ Payment ID extraído do JSON body:', paymentId)
        
        // Ensure we have the data structure we need
        if (!webhookData.data) {
          webhookData.data = { id: paymentId }
        }
        
      } catch (jsonError) {
        console.error('❌ Erro ao fazer parse do JSON:', jsonError)
        console.error('❌ Nenhum método de extração funcionou')
        throw new Error('Dados do webhook inválidos ou não encontrados')
      }
    }

    console.log('=== DADOS DO WEBHOOK PROCESSADOS ===')
    console.log(JSON.stringify(webhookData, null, 2))
    console.log('🆔 Payment ID final:', paymentId)

    // Verificar se é uma notificação de pagamento (aceitar 'payment' ou 'topic' payment)
    const webhookType = webhookData.type || webhookData.topic
    if (webhookType !== 'payment') {
      console.log('❌ Webhook ignorado - não é notificação de pagamento, tipo:', webhookType)
      return new Response(JSON.stringify({ status: 'ignored', reason: 'not_payment', type: webhookType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

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
    console.log('💳 Payment ID sendo consultado:', paymentId)
    console.log('🔑 Usando token que termina em:', mercadoPagoAccessToken.slice(-10))
    
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('📊 Status da resposta da API:', paymentResponse.status)
    console.log('📋 Headers da resposta:', Object.fromEntries(paymentResponse.headers.entries()))

    if (!paymentResponse.ok) {
      console.error('❌ Erro ao buscar pagamento:', paymentResponse.status, paymentResponse.statusText)
      const errorText = await paymentResponse.text()
      console.error('📄 Response body completo:', errorText)
      
      // Tentar parsear como JSON para mais detalhes
      try {
        const errorJson = JSON.parse(errorText)
        console.error('📋 Erro estruturado:', JSON.stringify(errorJson, null, 2))
      } catch (e) {
        console.error('❌ Erro não é JSON válido')
      }
      
      throw new Error(`Erro ao buscar pagamento: ${paymentResponse.status} - ${errorText}`)
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
    // Buscar a operação no banco pelo payment_id do Mercado Pago com dados otimizados
    const { data: operation, error: operationError } = await supabase
      .from('operations')
      .select('id, user_id, amount, status, type, mercado_pago_payment_id')
      .eq('mercado_pago_payment_id', paymentId)
      .eq('type', 'deposit')
      .single()

    if (operationError) {
      console.error('❌ Erro ao buscar operação:', operationError)
      
      // Debug: buscar todas as operações recentes para análise
      const { data: recentOps } = await supabase
        .from('operations')
        .select('id, mercado_pago_payment_id, created_at, status')
        .eq('type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(10)
        
      console.log('🔍 Debug - últimas 10 operações de depósito:', recentOps)
      
      // Retornar status 200 para não causar "falha na entrega" no Mercado Pago
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Operação não encontrada', 
        payment_id: paymentId,
        debug: { error: operationError.message, recent_operations: recentOps }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (!operation) {
      console.log('❌ Nenhuma operação encontrada para payment ID:', paymentId)
      
      // Debug: buscar todas as operações recentes
      const { data: recentOps } = await supabase
        .from('operations')
        .select('id, mercado_pago_payment_id, created_at, status')
        .eq('type', 'deposit')
        .order('created_at', { ascending: false })
        .limit(5)
        
      console.log('🔍 Últimas 5 operações de depósito:', recentOps)
      
      return new Response(JSON.stringify({ 
        status: 'operation_not_found', 
        payment_id: paymentId,
        recent_operations: recentOps 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('✅ Operação encontrada:', operation.id)
    console.log('👤 User ID:', operation.user_id)

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

    // Enviar notificação usando o cliente Supabase com retry
    console.log('🚀 Enviando notificação...')
    let notificationSuccess = false
    let notificationResult = null
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📞 Tentativa ${attempt} de envio da notificação`)
        
        const notificationPayload = {
          operationId: operation.id,
          paymentId: paymentId,
          type: 'deposit',
          amount: operation.amount,
          status: 'confirmed'
        }

        const { data, error } = await supabase.functions.invoke('send-notification-async', {
          body: notificationPayload
        })

        if (error) {
          console.error(`❌ Erro na tentativa ${attempt}:`, error)
          if (attempt === 3) throw error
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }

        console.log(`✅ Notificação enviada com sucesso na tentativa ${attempt}:`, data)
        notificationSuccess = true
        notificationResult = data
        break

      } catch (notificationError) {
        console.error(`❌ Falha na tentativa ${attempt}:`, notificationError)
        if (attempt === 3) {
          console.error('❌ Todas as tentativas de notificação falharam')
          // Log the error but don't fail the webhook - payment is confirmed
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    console.log('🎉 Processamento do webhook concluído com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pagamento processado e notificação enviada',
        operation_id: operation.id,
        payment_id: paymentId,
        notification_success: notificationSuccess,
        notification_result: notificationResult,
        amount: operation.amount,
        processed_at: new Date().toISOString()
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
