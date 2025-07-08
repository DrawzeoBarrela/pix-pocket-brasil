import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestNotificationData {
  type: 'deposit' | 'withdrawal'
  amount: number
  userName: string
  ppokerId: string
  status: string
  pixKey?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== TESTE TELEGRAM INICIADO ===')
    
    const { type, amount, userName, ppokerId, status, pixKey }: TestNotificationData = await req.json()
    
    console.log('📥 Dados recebidos:', { type, amount, userName, ppokerId, status, pixKey })

    // Get the Telegram Bot token from environment
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    console.log('🔑 Token verificado:', telegramBotToken ? 'Token existe' : 'Token não encontrado')
    
    if (!telegramBotToken) {
      console.error('❌ Token do Telegram não configurado')
      throw new Error('Token do Telegram não configurado')
    }

    // Format the current time in Brasília timezone
    const brasiliaTime = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // Format the message based on operation type
    let message = ''
    if (type === 'deposit') {
      message = `🟢 *TESTE - DEPÓSITO CONFIRMADO*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `📊 Status: ${status === 'pending' ? 'Pendente' : 'Confirmado'}\n` +
                `🧪 Tipo: Teste manual do sistema\n` +
                `🕒 Testado em: ${brasiliaTime} (Brasília)`
    } else {
      message = `🔴 *TESTE - SOLICITAÇÃO DE SAQUE*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `🔑 Chave PIX: ${pixKey || 'Não informada'}\n` +
                `📊 Status: ${status === 'pending' ? 'Pendente' : 'Confirmado'}\n` +
                `🧪 Tipo: Teste manual do sistema\n` +
                `🕒 Testado em: ${brasiliaTime} (Brasília)`
    }

    console.log('📝 Mensagem formatada:', message)

    // Send message to Telegram channel
    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
    
    const telegramPayload = {
      chat_id: '@Panambipokerfichas',
      text: message,
      parse_mode: 'Markdown'
    }

    console.log('📤 Enviando para Telegram:', telegramUrl)
    console.log('📦 Payload:', JSON.stringify(telegramPayload, null, 2))

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(telegramPayload)
    })

    const result = await response.json()
    console.log('📱 Resposta da API Telegram:', JSON.stringify(result, null, 2))
    console.log('📊 Status HTTP:', response.status)
    console.log('📊 OK?', response.ok)

    if (!response.ok) {
      console.error('❌ Erro na API do Telegram:', result)
      throw new Error(`Erro do Telegram: ${result.description || 'Erro desconhecido'}`)
    }

    console.log('✅ Teste do Telegram concluído com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Teste do Telegram executado com sucesso',
        telegramResponse: result,
        status: response.status,
        testData: { type, amount, userName, ppokerId, status },
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 ERRO no teste do Telegram:', error)
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