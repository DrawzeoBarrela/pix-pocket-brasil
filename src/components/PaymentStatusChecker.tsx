
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
        .select('*, profiles(*)')
        .eq('mercado_pago_payment_id', paymentId)
        .single();

      if (error) {
        console.error('Erro ao buscar operação:', error);
        setResult({
          status: 'error',
          message: 'Operação não encontrada no banco de dados',
          error: error.message
        });
      } else {
        setResult({
          status: 'found',
          operation,
          message: 'Operação encontrada no banco'
        });
      }

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
