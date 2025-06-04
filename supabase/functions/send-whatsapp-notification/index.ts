
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

    const callmeBotApiKey = Deno.env.get('CALLMEBOT_API_KEY')
    if (!callmeBotApiKey) {
      throw new Error('CallMeBot API key não configurada')
    }

    // Formatar a mensagem baseada no tipo de operação
    let message = ''
    if (type === 'deposit') {
      message = `🟢 *NOVO DEPÓSITO*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `📊 Status: ${status === 'pending' ? 'Pendente' : 'Confirmado'}`
    } else {
      message = `🔴 *NOVA SOLICITAÇÃO DE SAQUE*\n\n` +
                `💰 Valor: R$ ${amount.toFixed(2)}\n` +
                `👤 Usuário: ${userName}\n` +
                `🎮 PPPoker ID: ${ppokerId}\n` +
                `🔑 Chave PIX: ${pixKey || 'Não informada'}\n` +
                `📊 Status: ${status === 'pending' ? 'Pendente' : 'Confirmado'}`
    }

    console.log('Sending WhatsApp notification:', { type, amount, userName })

    // Enviar notificação via CallMeBot API
    const callmeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=555597123681&text=${encodeURIComponent(message)}&apikey=${callmeBotApiKey}`
    
    const response = await fetch(callmeBotUrl, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`Erro ao enviar mensagem WhatsApp: ${response.status}`)
    }

    const result = await response.text()
    console.log('WhatsApp notification sent successfully:', result)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificação WhatsApp enviada com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
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
