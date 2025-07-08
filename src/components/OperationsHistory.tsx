
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateTimeBrasilia } from '@/lib/utils';

interface Operation {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: string;
  created_at: string;
}

const OperationsHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOperations();
    }
  }, [user]);

  const fetchOperations = async () => {
    try {
      console.log('Fetching user operations for:', user?.id);
      
      const { data, error } = await supabase
        .from('operations')
        .select('id, type, amount, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Operations error:', error);
        throw error;
      }

      console.log('User operations data:', data);
      setOperations(data || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de operações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Histórico de Operações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Histórico de Operações</CardTitle>
      </CardHeader>
      <CardContent>
        {operations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma operação realizada ainda.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((operation) => (
                <TableRow key={operation.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {operation.type === 'deposit' ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="capitalize">
                        {operation.type === 'deposit' ? 'Depósito' : 'Saque'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {operation.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={operation.status === 'confirmed' ? 'default' : 'secondary'}
                      className={operation.status === 'confirmed' ? 'bg-green-600' : ''}
                    >
                      {operation.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDateTimeBrasilia(operation.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default OperationsHistory;
