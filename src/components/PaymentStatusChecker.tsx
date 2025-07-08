
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PaymentStatusChecker = () => {
  const [paymentId, setPaymentId] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  const checkPaymentStatus = async () => {
    if (!paymentId.trim()) {
      toast({
        title: "Erro",
        description: "Digite o ID do pagamento do Mercado Pago",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      // Buscar operação no banco
      const { data: operation, error } = await supabase
        .from('operations')
        .select('*')
        .eq('mercado_pago_payment_id', paymentId)
        .single();

      if (error) {
        console.error('Erro ao buscar operação:', error);
        setResult({
          status: 'error',
          message: 'Operação não encontrada no banco de dados',
          error: error.message
        });
        return;
      }

      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', operation.user_id)
        .single();

      setResult({
        status: 'found',
        operation: { ...operation, profiles: profile },
        message: 'Operação encontrada no banco'
      });

      // Tentar chamar o webhook manualmente para testar
      try {
        const webhookResponse = await fetch(
          'https://zwsaxgedqgmozetdqzyc.supabase.co/functions/v1/handle-mercado-pago-webhook',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'payment',
              action: 'payment.updated',
              data: { id: paymentId }
            })
          }
        );

        const webhookResult = await webhookResponse.json();
        console.log('Resultado do webhook:', webhookResult);
        
        setResult(prev => ({
          ...prev,
          webhook: {
            status: webhookResponse.status,
            result: webhookResult
          }
        }));

      } catch (webhookError) {
        console.error('Erro ao testar webhook:', webhookError);
        setResult(prev => ({
          ...prev,
          webhook: {
            error: webhookError.message
          }
        }));
      }

    } catch (error) {
      console.error('Erro geral:', error);
      setResult({
        status: 'error',
        message: 'Erro ao verificar status',
        error: error.message
      });
    } finally {
      setIsChecking(false);
    }
  };

  const manuallyConfirmPayment = async () => {
    if (!paymentId.trim()) {
      toast({
        title: "Erro",
        description: "Digite o ID do pagamento do Mercado Pago",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);

    try {
      // Buscar operação no banco
      const { data: operation, error } = await supabase
        .from('operations')
        .select('*')
        .eq('mercado_pago_payment_id', paymentId)
        .eq('status', 'pending')
        .single();

      if (error || !operation) {
        toast({
          title: "Erro",
          description: "Operação pendente não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', operation.user_id)
        .single();

      // Confirmar operação manualmente
      const { error: updateError } = await supabase
        .from('operations')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', operation.id);

      if (updateError) {
        throw updateError;
      }

      // Enviar notificação via função assíncrona
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-notification-async', {
        body: {
          operationId: operation.id,
          paymentId: paymentId,
          type: 'deposit',
          amount: operation.amount,
          status: 'confirmed'
        }
      });

      if (notificationError) {
        console.error('Erro na notificação:', notificationError);
        toast({
          title: "Aviso",
          description: "Pagamento confirmado, mas houve erro na notificação",
          variant: "default"
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Pagamento confirmado manualmente e notificação enviada",
        });
      }

      // Atualizar resultado
      setResult(prev => ({
        ...prev,
        manualConfirmation: {
          success: true,
          message: 'Operação confirmada manualmente',
          notification: notificationResult
        }
      }));

    } catch (error) {
      console.error('Erro ao confirmar manualmente:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar operação manualmente",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const testTelegramNotification = async () => {
    try {
      setIsChecking(true);
      
      // Teste direto da notificação Telegram
      const { data, error } = await supabase.functions.invoke('test-telegram-notification', {
        body: {
          type: 'deposit',
          amount: 50.00,
          userName: 'Teste Admin',
          ppokerId: '12345',
          status: 'confirmed'
        }
      });

      if (error) {
        throw error;
      }

      setResult({
        status: 'telegram_test',
        message: 'Teste do Telegram executado',
        telegramTest: data
      });

      toast({
        title: "Teste executado",
        description: "Verifique o resultado abaixo e o canal do Telegram",
      });

    } catch (error) {
      console.error('Erro no teste Telegram:', error);
      setResult({
        status: 'telegram_error',
        message: 'Erro no teste do Telegram',
        error: error.message
      });
      
      toast({
        title: "Erro",
        description: "Erro ao testar Telegram: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const resendNotification = async () => {
    if (!paymentId.trim()) {
      toast({
        title: "Erro",
        description: "Digite o ID do pagamento do Mercado Pago",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);

    try {
      // Buscar operação no banco
      const { data: operation, error } = await supabase
        .from('operations')
        .select('*')
        .eq('mercado_pago_payment_id', paymentId)
        .single();

      if (error || !operation) {
        toast({
          title: "Erro",
          description: "Operação não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Enviar notificação via função assíncrona
      const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-notification-async', {
        body: {
          operationId: operation.id,
          paymentId: paymentId,
          type: 'deposit',
          amount: operation.amount,
          status: operation.status
        }
      });

      if (notificationError) {
        console.error('Erro na notificação:', notificationError);
        toast({
          title: "Erro",
          description: "Erro ao reenviar notificação",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Notificação reenviada com sucesso",
        });
      }

      // Atualizar resultado
      setResult({
        status: 'notification_resent',
        message: 'Notificação reenviada',
        notification: notificationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao reenviar notificação:', error);
      toast({
        title: "Erro",
        description: "Erro ao reenviar notificação: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const debugMercadoPago = async () => {
    if (!paymentId.trim()) {
      toast({
        title: "Erro",
        description: "Digite o ID do pagamento do Mercado Pago",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    console.log('🔍 Iniciando debug para payment ID:', paymentId);

    try {
      console.log('🚀 Chamando função debug-mercado-pago-payment...');
      
      const { data, error } = await supabase.functions.invoke('debug-mercado-pago-payment', {
        body: {
          paymentId: paymentId.trim()
        }
      });

      console.log('📊 Resposta da função debug:', { data, error });

      if (error) {
        console.error('❌ Erro da função:', error);
        throw new Error(`Erro da função: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        console.warn('⚠️ Função retornou dados vazios');
        throw new Error('Função retornou dados vazios');
      }

      setResult({
        status: 'debug_mercado_pago',
        message: 'Debug do Mercado Pago executado com sucesso',
        debugResults: data,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Debug executado",
        description: `Verificação concluída para payment ID ${paymentId}`,
      });

    } catch (error) {
      console.error('💥 Erro completo no debug:', error);
      const errorMessage = error.message || 'Erro desconhecido';
      
      setResult({
        status: 'debug_error',
        message: 'Erro no debug do Mercado Pago',
        error: errorMessage,
        timestamp: new Date().toISOString(),
        paymentId: paymentId
      });
      
      toast({
        title: "Erro no Debug",
        description: `Falha ao debugar: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔍 Verificar Status do PIX</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paymentId">ID do Pagamento (Mercado Pago)</Label>
          <Input
            id="paymentId"
            placeholder="Ex: 117339161722"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
          />
        </div>

        <Button 
          onClick={checkPaymentStatus}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? 'Verificando...' : 'Verificar Status'}
        </Button>

        <Button 
          onClick={manuallyConfirmPayment}
          disabled={isChecking}
          className="w-full bg-orange-600 hover:bg-orange-700"
          variant="secondary"
        >
          Confirmar Manualmente
        </Button>

        <Button 
          onClick={testTelegramNotification}
          disabled={isChecking}
          className="w-full bg-blue-600 hover:bg-blue-700"
          variant="secondary"
        >
          🔔 Testar Telegram
        </Button>

        <Button 
          onClick={debugMercadoPago}
          disabled={isChecking}
          className="w-full bg-purple-600 hover:bg-purple-700"
          variant="secondary"
        >
          🔍 Debug Mercado Pago
        </Button>

        <Button 
          onClick={resendNotification}
          disabled={isChecking}
          className="w-full bg-green-600 hover:bg-green-700"
          variant="secondary"
        >
          🔔 Reenviar Notificação
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Resultado:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentStatusChecker;
