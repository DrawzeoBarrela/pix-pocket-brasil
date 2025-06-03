
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawCardProps {
  onQrCodeGenerated: (url: string, pixCode?: string) => void;
}

const WithdrawCard = ({ onQrCodeGenerated }: WithdrawCardProps) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido para saque.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Primeiro, criar a operação no banco de dados
      const { data: operation, error: operationError } = await supabase
        .from('operations')
        .insert({
          user_id: user?.id,
          type: 'withdrawal',
          amount: parseFloat(withdrawAmount)
        })
        .select()
        .single();

      if (operationError) throw operationError;

      console.log('Operation created:', operation.id);

      // Criar pagamento PIX no Mercado Pago
      const { data: pixData, error: pixError } = await supabase.functions.invoke(
        'create-pix-payment',
        {
          body: {
            amount: withdrawAmount,
            description: `Saque - Operação ${operation.id}`,
            operationId: operation.id
          }
        }
      );

      if (pixError) {
        console.error('PIX creation error:', pixError);
        throw new Error('Erro ao gerar PIX: ' + pixError.message);
      }

      if (!pixData.success) {
        throw new Error(pixData.error || 'Erro ao gerar PIX');
      }

      console.log('PIX created successfully:', pixData.payment_id);

      // Atualizar operação com dados do pagamento
      const { error: updateError } = await supabase
        .from('operations')
        .update({
          mercado_pago_payment_id: pixData.payment_id,
          pix_qr_code: pixData.qr_code_text
        })
        .eq('id', operation.id);

      if (updateError) {
        console.error('Update operation error:', updateError);
      }

      // Converter base64 para data URL se necessário
      const qrCodeUrl = pixData.qr_code.startsWith('data:image') 
        ? pixData.qr_code 
        : `data:image/png;base64,${pixData.qr_code}`;

      onQrCodeGenerated(qrCodeUrl, pixData.qr_code_text);

      toast({
        title: "PIX gerado com sucesso!",
        description: `Solicitação de saque de R$ ${withdrawAmount} criada.`,
      });

      setWithdrawAmount('');
    } catch (error: any) {
      console.error('Withdraw error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar saque",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-red-600">
          <ArrowUpCircle size={24} />
          Saque
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="withdraw">Valor do Saque (R$)</Label>
          <Input
            id="withdraw"
            type="number"
            placeholder="0,00"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            min="0"
            step="0.01"
            disabled={isLoading}
          />
        </div>
        <Button 
          onClick={handleWithdraw}
          className="w-full bg-red-600 hover:bg-red-700"
          disabled={isLoading}
        >
          {isLoading ? 'Gerando PIX...' : 'Solicitar Saque'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WithdrawCard;
