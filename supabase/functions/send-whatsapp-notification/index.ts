
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

    // Buscar as API keys para cada número
    const callmeBotApiKey1 = Deno.env.get('CALLMEBOT_API_KEY')
    const callmeBotApiKey2 = '6432823' // API key específica para o número 555592215747
    
    if (!callmeBotApiKey1) {
      throw new Error('CallMeBot API key principal não configurada')
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

    // Configurar números e suas respectivas API keys
    const phoneConfigs = [
      { phone: '555597123681', apiKey: callmeBotApiKey1 },
      { phone: '555592215747', apiKey: callmeBotApiKey2 }
    ]
    
    // Enviar notificação para ambos os números
    const sendPromises = phoneConfigs.map(async (config) => {
      if (!config.apiKey) {
        console.log(`API key não encontrada para ${config.phone}, pulando...`)
        return { phone: config.phone, success: false, error: 'API key não configurada' }
      }

      const callmeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=${config.phone}&text=${encodeURIComponent(message)}&apikey=${config.apiKey}`
      
      try {
        const response = await fetch(callmeBotUrl, {
          method: 'GET'
        })

        const result = await response.text()
        console.log(`WhatsApp notification response for ${config.phone}:`, result)

        // Verificar se a resposta contém erro de API key
        if (result.includes('APIKey is invalid')) {
          throw new Error(`API key inválida para ${config.phone}`)
        }

        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status} para ${config.phone}`)
        }

        return { phone: config.phone, success: true, result }
      } catch (error) {
        console.error(`Erro ao enviar para ${config.phone}:`, error)
        return { phone: config.phone, success: false, error: error.message }
      }
    })

    // Aguardar todas as mensagens serem enviadas
    const results = await Promise.allSettled(sendPromises)
    
    // Processar resultados
    const successResults = []
    const failureResults = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successResults.push(result.value)
        } else {
          failureResults.push(result.value)
        }
      } else {
        failureResults.push({
          phone: phoneConfigs[index].phone,
          success: false,
          error: result.reason?.message || 'Erro desconhecido'
        })
      }
    })

    const successCount = successResults.length
    const failureCount = failureResults.length

    console.log(`Resultados: ${successCount} sucessos, ${failureCount} falhas`)
    
    if (failureCount > 0) {
      console.log('Falhas detalhadas:', failureResults)
    }

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Notificação WhatsApp: ${successCount} sucessos, ${failureCount} falhas`,
        details: {
          successCount,
          failureCount,
          totalNumbers: phoneConfigs.length,
          successes: successResults,
          failures: failureResults
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: successCount > 0 ? 200 : 400,
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
