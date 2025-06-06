
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminOperation {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: string;
  created_at: string;
  user_id: string;
  user_name: string;
  pppoker_id: string;
  pix_key?: string;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    pppoker_id?: string;
    ppokerId?: string;
  };
}

const AdminOperationsHistory = () => {
  const { toast } = useToast();
  const [operations, setOperations] = useState<AdminOperation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      console.log('Fetching all operations for admin...');
      
      // Get all operations (admin policy will allow this)
      const { data: operationsData, error: operationsError } = await supabase
        .from('operations')
        .select('id, type, amount, status, created_at, user_id, pix_key')
        .order('created_at', { ascending: false });

      if (operationsError) {
        console.error('Operations error:', operationsError);
        throw operationsError;
      }

      console.log('Operations data:', operationsData);

      // Get all profiles (admin policy will allow this)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, pppoker_id');

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }

      console.log('Profiles data:', profilesData);

      // Get auth users data as fallback
      const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers();
      
      if (authUsersError) {
        console.error('Auth users error:', authUsersError);
      }

      console.log('Auth users data:', authUsersData?.users);

      // Create a map of user_id to profile data for efficient lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Create a map of auth users data as fallback
      const authUsersMap = new Map();
      (authUsersData?.users as AuthUser[] || []).forEach(user => {
        authUsersMap.set(user.id, {
          name: user.user_metadata?.name || user.email,
          pppoker_id: user.user_metadata?.pppoker_id || user.user_metadata?.ppokerId || 'N/A'
        });
      });

      // Transform the data by joining operations with profiles and fallback to auth users
      const transformedOperations: AdminOperation[] = (operationsData || []).map(operation => {
        const profile = profilesMap.get(operation.user_id);
        const authUser = authUsersMap.get(operation.user_id);
        
        return {
          id: operation.id,
          type: operation.type,
          amount: operation.amount,
          status: operation.status,
          created_at: operation.created_at,
          user_id: operation.user_id,
          user_name: profile?.name || authUser?.name || 'Usuário não encontrado',
          pppoker_id: profile?.pppoker_id || authUser?.pppoker_id || 'N/A',
          pix_key: operation.pix_key
        };
      });

      console.log('Transformed operations:', transformedOperations);
      setOperations(transformedOperations);
    } catch (error: any) {
      console.error('Admin fetch error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico completo. Verifique suas permissões.",
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
          <CardTitle className="flex items-center gap-2">
            <History size={24} />
            Histórico Completo de Operações
          </CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <History size={24} />
          Histórico Completo de Operações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {operations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma operação encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>PPPoker ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="font-medium">
                      {operation.user_name}
                    </TableCell>
                    <TableCell>
                      {operation.pppoker_id}
                    </TableCell>
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
                      {operation.type === 'withdrawal' && operation.pix_key ? (
                        <span className="text-sm text-gray-600">{operation.pix_key}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
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
                      {new Date(operation.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(operation.created_at).toLocaleTimeString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminOperationsHistory;
