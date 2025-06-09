
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FinancialData {
  totalDeposits: number;
  totalWithdrawals: number;
  confirmedDeposits: number;
  confirmedWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

const AdminFinancialSummary = () => {
  const { toast } = useToast();
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    confirmedDeposits: 0,
    confirmedWithdrawals: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      console.log('Fetching financial data...');
      
      // Buscar todas as operações
      const { data: operations, error } = await supabase
        .from('operations')
        .select('type, amount, status');

      if (error) {
        console.error('Financial data error:', error);
        throw error;
      }

      console.log('Operations data:', operations);

      // Calcular totais
      const data: FinancialData = {
        totalDeposits: 0,
        totalWithdrawals: 0,
        confirmedDeposits: 0,
        confirmedWithdrawals: 0,
        pendingDeposits: 0,
        pendingWithdrawals: 0,
      };

      operations?.forEach(operation => {
        const amount = Number(operation.amount);
        
        if (operation.type === 'deposit') {
          data.totalDeposits += amount;
          if (operation.status === 'confirmed') {
            data.confirmedDeposits += amount;
          } else {
            data.pendingDeposits += amount;
          }
        } else if (operation.type === 'withdrawal') {
          data.totalWithdrawals += amount;
          if (operation.status === 'confirmed') {
            data.confirmedWithdrawals += amount;
          } else {
            data.pendingWithdrawals += amount;
          }
        }
      });

      console.log('Calculated financial data:', data);
      setFinancialData(data);
    } catch (error: any) {
      console.error('Financial fetch error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados financeiros.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const estimatedBalance = financialData.confirmedDeposits - financialData.confirmedWithdrawals;
  const pendingBalance = financialData.pendingDeposits - financialData.pendingWithdrawals;

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={24} />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Carregando dados financeiros...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={24} />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Depósitos Confirmados */}
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Depósitos Confirmados
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(financialData.confirmedDeposits)}
                    </p>
                  </div>
                  <ArrowDownCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            {/* Saques Confirmados */}
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Saques Confirmados
                    </p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(financialData.confirmedWithdrawals)}
                    </p>
                  </div>
                  <ArrowUpCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </CardContent>
            </Card>

            {/* Saldo Estimado */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Saldo Estimado
                    </p>
                    <p className={`text-2xl font-bold ${estimatedBalance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                      {formatCurrency(estimatedBalance)}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            {/* Operações Pendentes */}
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Pendente (Líquido)
                    </p>
                    <p className={`text-2xl font-bold ${pendingBalance >= 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                      {formatCurrency(pendingBalance)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Detalhamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Depósitos Detalhados */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <ArrowDownCircle size={20} />
              Depósitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Geral:</span>
              <span className="font-semibold">{formatCurrency(financialData.totalDeposits)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Confirmados:</span>
              <span className="font-semibold text-green-600">{formatCurrency(financialData.confirmedDeposits)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pendentes:</span>
              <span className="font-semibold text-yellow-600">{formatCurrency(financialData.pendingDeposits)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Saques Detalhados */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ArrowUpCircle size={20} />
              Saques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Geral:</span>
              <span className="font-semibold">{formatCurrency(financialData.totalWithdrawals)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Confirmados:</span>
              <span className="font-semibold text-red-600">{formatCurrency(financialData.confirmedWithdrawals)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pendentes:</span>
              <span className="font-semibold text-yellow-600">{formatCurrency(financialData.pendingWithdrawals)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminFinancialSummary;
