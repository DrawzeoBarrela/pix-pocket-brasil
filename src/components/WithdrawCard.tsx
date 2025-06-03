
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const WithdrawCard = () => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
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

    try {
      const { error } = await supabase
        .from('operations')
        .insert({
          user_id: user?.id,
          type: 'withdrawal',
          amount: parseFloat(withdrawAmount)
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: `Solicitação de saque de R$ ${withdrawAmount} criada.`,
      });

      setWithdrawAmount('');
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
          <ArrowDownCircle size={24} />
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
