
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OperationsHistory = () => {
  return (
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
  );
};

export default OperationsHistory;
