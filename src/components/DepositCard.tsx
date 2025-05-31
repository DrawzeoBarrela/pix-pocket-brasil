
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DepositCard = () => {
  const [depositAmount, setDepositAmount] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido para depósito.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('operations' as any)
        .insert({
          user_id: user?.id,
          type: 'deposit',
          amount: parseFloat(depositAmount)
        } as any);

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: `Solicitação de depósito de R$ ${depositAmount} criada.`,
      });

      setDepositAmount('');
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
        <CardTitle className="flex items-center justify-center gap-2 text-green-600">
          <ArrowDownCircle size={24} />
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
          />
        </div>
        <Button 
          onClick={handleDeposit}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Solicitar Depósito
        </Button>
      </CardContent>
    </Card>
  );
};

export default DepositCard;
