import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  operationId: string
  paymentId: string
  type: 'deposit' | 'withdrawal'
  amount: number
  status: string
}

serve(async (req) => {
  console.log('=== NOTIFICATION FUNCTION CALLED ===')
  console.log('Method:', req.method)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.text()
    console.log('Raw notification request body:', requestBody)
    
    let parsedBody: NotificationPayload
    try {
      parsedBody = JSON.parse(requestBody)
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON da notificação:', parseError)
      throw new Error(`Erro no parse do JSON: ${parseError.message}`)
    }
    
    const { operationId, paymentId, type, amount, status } = parsedBody
    console.log('📱 Processando notificação para:', { operationId, paymentId, type, amount, status })

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📱 Enviando notificação assíncrona para operação:', operationId)

    // Buscar dados da operação primeiro
    const { data: operationData, error: queryError } = await supabase
      .from('operations')
      .select('id, amount, status, type, mercado_pago_payment_id, user_id')
      .eq('id', operationId)
      .single()

    if (queryError || !operationData) {
      console.error('❌ Erro ao buscar dados da operação:', queryError)
      throw new Error('Operação não encontrada')
    }

    // Buscar dados do perfil do usuário
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('name, pppoker_id')
      .eq('id', operationData.user_id)
      .single()

    if (profileError || !profileData) {
      console.error('❌ Erro ao buscar dados do perfil:', profileError)
      throw new Error('Perfil do usuário não encontrado')
    }

    const userName = profileData.name || 'Usuário'
    const ppokerId = profileData.pppoker_id || 'N/A'

    // Preparar mensagem do Telegram
    const brasiliaTime = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    let message = ''
    if (type === 'deposit') {
      message = `🟢 *DEPÓSITO CONFIRMADO*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `📊 Status: Confirmado ✅\n` +
                `🕒 Confirmado em: ${brasiliaTime}\n` +
                `🆔 Payment ID: ${paymentId}`
    } else {
      message = `🔴 *NOVA SOLICITAÇÃO DE SAQUE*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `📊 Status: ${status === 'pending' ? 'Pendente' : 'Confirmado'}\n` +
                `🕒 Horário: ${brasiliaTime}`
    }

    // Enviar para o Telegram com retry
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!telegramBotToken) {
      throw new Error('Token do Telegram não configurado')
    }

    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
    const telegramPayload = {
      chat_id: '@Panambipokerfichas',
      text: message,
      parse_mode: 'Markdown'
    }

    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        const telegramResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramPayload)
        })

        const telegramResult = await telegramResponse.json()

        if (telegramResponse.ok) {
          console.log('✅ Notificação enviada com sucesso:', telegramResult.message_id)
          break
        } else {
          throw new Error(`Erro do Telegram: ${telegramResult.description}`)
        }
      } catch (error) {
        retryCount++
        console.error(`❌ Tentativa ${retryCount} falhou:`, error.message)
        
        if (retryCount >= maxRetries) {
          throw error
        }
        
        // Aguardar antes de tentar novamente (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificação enviada com sucesso',
        operationId,
        retryCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Erro ao enviar notificação:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})