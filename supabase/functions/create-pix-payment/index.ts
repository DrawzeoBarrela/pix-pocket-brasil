
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { amount, description, operationId } = await req.json()

    if (!amount || amount <= 0) {
      throw new Error('Valor inválido')
    }

    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mercadoPagoAccessToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN não encontrado')
      throw new Error('Token do Mercado Pago não configurado')
    }

    console.log('Creating PIX payment for amount:', amount, 'operationId:', operationId)
    console.log('Using token:', mercadoPagoAccessToken.substring(0, 20) + '...')

    // Buscar dados do usuário da operação
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar a operação para obter o user_id
    const { data: operation, error: operationError } = await supabase
      .from('operations')
      .select('user_id')
      .eq('id', operationId)
      .single()

    if (operationError || !operation) {
      console.error('Erro ao buscar operação:', operationError)
      throw new Error('Operação não encontrada')
    }

    // Buscar dados do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, cpf')
      .eq('id', operation.user_id)
      .single()

    if (profileError || !profile) {
      console.error('Erro ao buscar perfil do usuário:', profileError)
      throw new Error('Perfil do usuário não encontrado')
    }

    // Buscar email do usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(operation.user_id)
    
    if (userError || !user) {
      console.error('Erro ao buscar usuário:', userError)
      throw new Error('Usuário não encontrado')
    }

    // Dividir nome em primeiro e último nome
    const nameParts = profile.name.trim().split(' ')
    const firstName = nameParts[0] || 'Usuario'
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Sistema'

    console.log('User data:', { firstName, lastName, email: user.email, cpf: profile.cpf })

    // Gerar um idempotency key único para esta operação
    const idempotencyKey = `${operationId}-${Date.now()}`

    // Criar payment no Mercado Pago com dados reais do usuário
    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: description || `Depósito - Operação ${operationId}`,
      payment_method_id: 'pix',
      external_reference: operationId,
      payer: {
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        ...(profile.cpf && {
          identification: {
            type: 'CPF',
            number: profile.cpf.replace(/\D/g, '') // Remove formatação do CPF
          }
        })
      },
      notification_url: `https://zwsaxgedqgmozetdqzyc.supabase.co/functions/v1/handle-mercado-pago-webhook`
    }

    console.log('Payment data:', JSON.stringify(paymentData, null, 2))

    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentData)
    })

    const responseText = await mercadoPagoResponse.text()
    console.log('Mercado Pago response status:', mercadoPagoResponse.status)
    console.log('Mercado Pago response:', responseText)

    if (!mercadoPagoResponse.ok) {
      console.error('Mercado Pago error:', responseText)
      throw new Error(`Erro ao criar pagamento no Mercado Pago: ${mercadoPagoResponse.status} - ${responseText}`)
    }

    const paymentResult = JSON.parse(responseText)
    console.log('Payment created successfully:', paymentResult.id)

    // Extrair informações do PIX
    const pixData = paymentResult.point_of_interaction?.transaction_data
    
    if (!pixData) {
      console.error('Payment result:', JSON.stringify(paymentResult, null, 2))
      throw new Error('Dados do PIX não encontrados na resposta')
    }

    console.log('PIX data found:', {
      qr_code_exists: !!pixData.qr_code,
      qr_code_base64_exists: !!pixData.qr_code_base64
    })

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentResult.id,
        qr_code: pixData.qr_code_base64,
        qr_code_text: pixData.qr_code,
        amount: paymentResult.transaction_amount,
        status: paymentResult.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating PIX payment:', error)
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
