
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
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
    const { type, amount, userName, ppokerId, status, pixKey }: NotificationData = await req.json()

    // Get the Telegram Bot token from environment
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!telegramBotToken) {
      throw new Error('Telegram Bot token não configurado')
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
      message = `🟢 *NOVO DEPÓSITO*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `📊 Status: ${status === 'pending' ? 'Pendente' : 'Confirmado'}\n` +
                `🕒 Horário: ${brasiliaTime} (Brasília)`
    } else {
      message = `🔴 *NOVA SOLICITAÇÃO DE SAQUE*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `🔑 Chave PIX: ${pixKey || 'Não informada'}\n` +
                `📊 Status: ${status === 'pending' ? 'Pendente' : 'Confirmado'}\n` +
                `🕒 Horário: ${brasiliaTime} (Brasília)`
    }

    console.log('Sending Telegram notification:', { type, amount, userName })

    // Send message to Telegram channel
    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
    
    const telegramPayload = {
      chat_id: '@Panambipokerfichas',
      text: message,
      parse_mode: 'Markdown'
    }

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(telegramPayload)
    })

    const result = await response.json()
    console.log('Telegram API response:', result)

    if (!response.ok) {
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificação Telegram enviada com sucesso',
        telegramResponse: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending Telegram notification:', error)
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
