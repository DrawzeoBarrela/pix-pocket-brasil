import React from 'react';
import { PaymentResult } from '@/types/paymentChecker';

interface ResultDisplayProps {
  result: PaymentResult | null;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  if (!result) return null;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">Resultado:</h3>
      <pre className="text-sm overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
};