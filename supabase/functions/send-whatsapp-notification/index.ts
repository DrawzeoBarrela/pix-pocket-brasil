
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

    // Lista de números para enviar as notificações
    const phoneNumbers = ['555597123681', '555592215747']
    
    // Enviar notificação para ambos os números
    const sendPromises = phoneNumbers.map(async (phone) => {
      const callmeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${callmeBotApiKey}`
      
      const response = await fetch(callmeBotUrl, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagem WhatsApp para ${phone}: ${response.status}`)
      }

      const result = await response.text()
      console.log(`WhatsApp notification sent successfully to ${phone}:`, result)
      return { phone, success: true, result }
    })

    // Aguardar todas as mensagens serem enviadas
    const results = await Promise.allSettled(sendPromises)
    
    // Verificar se pelo menos uma mensagem foi enviada com sucesso
    const successCount = results.filter(result => result.status === 'fulfilled').length
    const failureCount = results.filter(result => result.status === 'rejected').length

    if (successCount === 0) {
      throw new Error('Falha ao enviar mensagem para todos os números')
    }

    console.log(`Mensagens enviadas: ${successCount} sucessos, ${failureCount} falhas`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificação WhatsApp enviada para ${successCount} de ${phoneNumbers.length} números`,
        details: {
          successCount,
          failureCount,
          totalNumbers: phoneNumbers.length
        }
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
