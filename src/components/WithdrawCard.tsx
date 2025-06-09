
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const WithdrawCard = () => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const sendWhatsAppNotification = async (operationData: any) => {
    try {
      await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          type: 'withdrawal',
          amount: operationData.amount,
          userName: operationData.user_name,
          ppokerId: operationData.pppoker_id,
          status: 'pending',
          pixKey: operationData.pix_key
        }
      });
    } catch (error) {
      console.error('Erro ao enviar notificação WhatsApp:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido para saque.",
        variant: "destructive"
      });
      return;
    }

    if (!pixKey.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma chave PIX válida para receber o saque.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('operations')
        .insert({
          user_id: user?.id,
          type: 'withdrawal',
          amount: parseFloat(withdrawAmount),
          pix_key: pixKey.trim(),
          notes: isAdmin && adminNotes.trim() ? adminNotes.trim() : null
        });

      if (error) throw error;

      // Buscar dados do usuário para a notificação
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, pppoker_id')
        .eq('id', user?.id)
        .single();

      // Enviar notificação WhatsApp
      await sendWhatsAppNotification({
        amount: parseFloat(withdrawAmount),
        user_name: profile?.name || user?.email || 'Usuário',
        pppoker_id: profile?.pppoker_id || 'N/A',
        pix_key: pixKey.trim()
      });

      toast({
        title: "Solicitação enviada!",
        description: `Solicitação de saque de R$ ${withdrawAmount} criada.`,
      });

      setWithdrawAmount('');
      setPixKey('');
      setAdminNotes('');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pixKey">Chave PIX para Recebimento</Label>
          <Input
            id="pixKey"
            type="text"
            placeholder="Digite sua chave PIX (CPF, e-mail, telefone ou chave aleatória)"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
          />
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <Label htmlFor="adminNotesWithdraw">Observação Administrativa</Label>
            <textarea
              id="adminNotesWithdraw"
              placeholder="Adicionar observação sobre este saque..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full min-h-[60px] px-3 py-2 text-sm border border-input rounded-md bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
        )}

        <Button 
          onClick={handleWithdraw}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Solicitar Saque
        </Button>
      </CardContent>
    </Card>
  );
};

export default WithdrawCard;
