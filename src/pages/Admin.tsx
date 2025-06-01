
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LogOut, ArrowUpCircle, ArrowDownCircle, Check, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AdminOperationsHistory from '@/components/AdminOperationsHistory';

interface Operation {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: string;
  created_at: string;
  user_id: string;
  user_name: string;
  pppoker_id: string;
}

const Admin = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      console.log('Fetching operations...');
      
      // Get operations with a join to profiles
      const { data: operationsData, error: operationsError } = await supabase
        .from('operations')
        .select(`
          id,
          type,
          amount,
          status,
          created_at,
          user_id,
          profiles!inner (
            name,
            pppoker_id
          )
        `)
        .order('created_at', { ascending: false });

      if (operationsError) {
        console.error('Operations error:', operationsError);
        throw operationsError;
      }

      console.log('Operations data with profiles:', operationsData);

      // Transform the data to flatten the profiles
      const transformedOperations: Operation[] = (operationsData || []).map(operation => ({
        id: operation.id,
        type: operation.type,
        amount: operation.amount,
        status: operation.status,
        created_at: operation.created_at,
        user_id: operation.user_id,
        user_name: operation.profiles?.name || 'Usuário não encontrado',
        pppoker_id: operation.profiles?.pppoker_id || 'N/A'
      }));

      console.log('Transformed operations:', transformedOperations);
      setOperations(transformedOperations);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmOperation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('operations')
        .update({ 
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await fetchOperations();
      
      toast({
        title: "Operação confirmada!",
        description: "A operação foi confirmada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const withdrawalOperations = operations.filter(op => op.type === 'withdrawal');
  const depositOperations = operations.filter(op => op.type === 'deposit');

  const RequestCard = ({ operation, onConfirm }: { operation: Operation; onConfirm: (id: string) => void }) => (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{operation.user_name}</h3>
            <p className="text-sm text-gray-600">PPPoker ID: {operation.pppoker_id}</p>
            <p className="text-sm text-gray-500">Data: {new Date(operation.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              R$ {operation.amount.toFixed(2)}
            </p>
            <Badge 
              variant={operation.status === 'confirmed' ? 'default' : 'secondary'}
              className={operation.status === 'confirmed' ? 'bg-green-600' : ''}
            >
              {operation.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
            </Badge>
          </div>
        </div>
        
        {operation.status === 'pending' && (
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox 
              id={`confirm-${operation.id}`}
              onCheckedChange={(checked) => {
                if (checked) {
                  onConfirm(operation.id);
                }
              }}
            />
            <label 
              htmlFor={`confirm-${operation.id}`} 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Confirmar operação
            </label>
          </div>
        )}

        {operation.status === 'confirmed' && (
          <div className="flex items-center space-x-2 pt-2 border-t text-green-600">
            <Check size={16} />
            <span className="text-sm font-medium">Operação confirmada</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

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
            onClick={signOut} 
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
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="withdrawals" className="flex items-center gap-2">
                <ArrowUpCircle size={16} />
                Saques
              </TabsTrigger>
              <TabsTrigger value="deposits" className="flex items-center gap-2">
                <ArrowDownCircle size={16} />
                Depósitos
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History size={16} />
                Histórico
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
                    {withdrawalOperations.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Nenhuma solicitação de saque encontrada.
                      </p>
                    ) : (
                      withdrawalOperations.map((operation) => (
                        <RequestCard
                          key={operation.id}
                          operation={operation}
                          onConfirm={confirmOperation}
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
                    {depositOperations.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Nenhuma solicitação de depósito encontrada.
                      </p>
                    ) : (
                      depositOperations.map((operation) => (
                        <RequestCard
                          key={operation.id}
                          operation={operation}
                          onConfirm={confirmOperation}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <AdminOperationsHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;
