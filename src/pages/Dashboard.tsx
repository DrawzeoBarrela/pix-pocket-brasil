
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpCircle, ArrowDownCircle, LogOut, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const { user, signOut } = useAuth();
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
      // Create withdrawal operation
      const { error } = await supabase
        .from('operations' as any)
        .insert({
          user_id: user?.id,
          type: 'withdrawal',
          amount: parseFloat(withdrawAmount)
        } as any);

      if (error) throw error;

      // Simulate Mercado Pago QR Code generation
      const mockQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PIX_CODE_${Math.random().toString(36).substr(2, 9)}`;
      setQrCodeUrl(mockQrCode);
      setShowQrCode(true);

      toast({
        title: "QR Code PIX gerado!",
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
      // Create deposit operation
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white rounded-lg shadow-md p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo, {user?.email}</p>
          </div>
          <Button 
            onClick={signOut} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="operations" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="operations">Operações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="operations">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Withdraw Card */}
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
                    <Button 
                      onClick={handleWithdraw}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Solicitar Saque
                    </Button>
                  </CardContent>
                </Card>

                {/* Deposit Card */}
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
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Histórico de Operações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma operação realizada ainda.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* QR Code Modal */}
        <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode size={20} />
                QR Code PIX
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Escaneie o QR Code abaixo para efetuar o pagamento PIX
              </p>
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="mx-auto rounded-lg shadow-md"
                />
              )}
              <p className="text-xs text-gray-500">
                Após o pagamento, sua solicitação será processada automaticamente.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
