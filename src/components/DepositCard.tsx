
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DepositCardProps {
  onQrCodeGenerated: (url: string, pixCode?: string) => void;
}

const DepositCard = ({ onQrCodeGenerated }: DepositCardProps) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const sendWhatsAppNotification = async (operationData: any) => {
    try {
      await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          type: 'deposit',
          amount: operationData.amount,
          userName: operationData.user_name,
          ppokerId: operationData.pppoker_id,
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Erro ao enviar notificação WhatsApp:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido para depósito.",
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
          type: 'deposit',
          amount: parseFloat(depositAmount)
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
            amount: depositAmount,
            description: `Depósito - Operação ${operation.id}`,
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

      // Buscar dados do usuário para a notificação
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, pppoker_id')
        .eq('id', user?.id)
        .single();

      // Enviar notificação WhatsApp
      await sendWhatsAppNotification({
        amount: parseFloat(depositAmount),
        user_name: profile?.name || user?.email || 'Usuário',
        pppoker_id: profile?.pppoker_id || 'N/A'
      });

      // Converter base64 para data URL se necessário
      const qrCodeUrl = pixData.qr_code.startsWith('data:image') 
        ? pixData.qr_code 
        : `data:image/png;base64,${pixData.qr_code}`;

      onQrCodeGenerated(qrCodeUrl, pixData.qr_code_text);

      toast({
        title: "PIX gerado com sucesso!",
        description: `PIX de depósito de R$ ${depositAmount} criado.`,
      });

      setDepositAmount('');
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar depósito",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-green-600">
          <ArrowUpCircle size={24} />
          Depósito
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deposit">Valor do Depósito (R$)</Label>
          <Input
            id="deposit"
            type="number"
            placeholder="0,00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            min="0"
            step="0.01"
            disabled={isLoading}
          />
        </div>
        <Button 
          onClick={handleDeposit}
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isLoading}
        >
          {isLoading ? 'Gerando PIX...' : 'Gerar PIX para Depósito'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DepositCard;
