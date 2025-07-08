import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DebugRequest {
  paymentId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { paymentId }: DebugRequest = await req.json()
    
    console.log('🔍 Debugando payment ID:', paymentId)
    
    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mercadoPagoAccessToken) {
      throw new Error('Token do Mercado Pago não configurado')
    }

    console.log('🔑 Token configurado (últimos 10 chars):', mercadoPagoAccessToken.slice(-10))

    // Testar diferentes endpoints para diagnosticar
    const endpoints = [
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      `https://api.mercadopago.com/v1/payments/search?external_reference=${paymentId}`,
      'https://api.mercadopago.com/v1/payments/search?limit=10'
    ]

    const results = []

    for (const endpoint of endpoints) {
      console.log(`🌐 Testando endpoint: ${endpoint}`)
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${mercadoPagoAccessToken}`,
            'Content-Type': 'application/json',
          },
        })

        const responseText = await response.text()
        let responseData
        
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        results.push({
          endpoint,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData
        })

        console.log(`✅ Resposta de ${endpoint}:`, response.status)
        
      } catch (error) {
        results.push({
          endpoint,
          error: error.message
        })
        console.error(`❌ Erro em ${endpoint}:`, error.message)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        tokenLastChars: mercadoPagoAccessToken.slice(-10),
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Erro no debug:', error)
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