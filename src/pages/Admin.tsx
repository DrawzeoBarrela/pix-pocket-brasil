
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LogOut, ArrowUpCircle, ArrowDownCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock data for demonstration
  const [withdrawalRequests, setWithdrawalRequests] = useState([
    {
      id: 1,
      userName: 'João Silva',
      ppokerId: 'PP123456',
      amount: 150.00,
      date: '2024-01-15',
      status: 'pending'
    },
    {
      id: 2,
      userName: 'Maria Santos',
      ppokerId: 'PP789012',
      amount: 300.00,
      date: '2024-01-15',
      status: 'pending'
    }
  ]);

  const [depositRequests, setDepositRequests] = useState([
    {
      id: 1,
      userName: 'Carlos Oliveira',
      ppokerId: 'PP345678',
      amount: 200.00,
      date: '2024-01-15',
      status: 'pending'
    },
    {
      id: 2,
      userName: 'Ana Costa',
      ppokerId: 'PP901234',
      amount: 500.00,
      date: '2024-01-15',
      status: 'pending'
    }
  ]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const confirmWithdrawal = (id: number) => {
    setWithdrawalRequests(prev => 
      prev.map(request => 
        request.id === id 
          ? { ...request, status: 'confirmed' }
          : request
      )
    );
    toast({
      title: "Saque confirmado!",
      description: "A operação foi confirmada com sucesso.",
    });
  };

  const confirmDeposit = (id: number) => {
    setDepositRequests(prev => 
      prev.map(request => 
        request.id === id 
          ? { ...request, status: 'confirmed' }
          : request
      )
    );
    toast({
      title: "Depósito confirmado!",
      description: "A operação foi confirmada com sucesso.",
    });
  };

  const RequestCard = ({ request, type, onConfirm }: any) => (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{request.userName}</h3>
            <p className="text-sm text-gray-600">PPPoker ID: {request.ppokerId}</p>
            <p className="text-sm text-gray-500">Data: {new Date(request.date).toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              R$ {request.amount.toFixed(2)}
            </p>
            <Badge 
              variant={request.status === 'confirmed' ? 'default' : 'secondary'}
              className={request.status === 'confirmed' ? 'bg-green-600' : ''}
            >
              {request.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
            </Badge>
          </div>
        </div>
        
        {request.status === 'pending' && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox 
              id={`confirm-${type}-${request.id}`}
              onChange={(checked) => {
                if (checked) {
                  onConfirm(request.id);
                }
              }}
            />
            <label 
              htmlFor={`confirm-${type}-${request.id}`} 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Confirmar operação
            </label>
          </div>
        )}

        {request.status === 'confirmed' && (
          <div className="flex items-center space-x-2 pt-2 border-t text-green-600">
            <Check size={16} />
            <span className="text-sm font-medium">Operação confirmada</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white rounded-lg shadow-md p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
            <p className="text-gray-600">Gerenciar solicitações de saque e depósito</p>
          </div>
          <Button 
            onClick={handleLogout} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="withdrawals" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="withdrawals" className="flex items-center gap-2">
                <ArrowUpCircle size={16} />
                Saques
              </TabsTrigger>
              <TabsTrigger value="deposits" className="flex items-center gap-2">
                <ArrowDownCircle size={16} />
                Depósitos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="withdrawals">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <ArrowUpCircle size={24} />
                    Solicitações de Saque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {withdrawalRequests.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Nenhuma solicitação de saque encontrada.
                      </p>
                    ) : (
                      withdrawalRequests.map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          type="withdrawal"
                          onConfirm={confirmWithdrawal}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deposits">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <ArrowDownCircle size={24} />
                    Solicitações de Depósito
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {depositRequests.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Nenhuma solicitação de depósito encontrada.
                      </p>
                    ) : (
                      depositRequests.map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          type="deposit"
                          onConfirm={confirmDeposit}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
