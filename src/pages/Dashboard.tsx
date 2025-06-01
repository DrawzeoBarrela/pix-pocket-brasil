
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardHeader from '@/components/DashboardHeader';
import DepositCard from '@/components/DepositCard';
import WithdrawCard from '@/components/WithdrawCard';
import QRCodeModal from '@/components/QRCodeModal';
import OperationsHistory from '@/components/OperationsHistory';

const Dashboard = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);

  const handleQrCodeGenerated = (url: string) => {
    setQrCodeUrl(url);
    setShowQrCode(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-4">
        <DashboardHeader />

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="operations" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="operations">Operações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="operations">
              <div className="grid md:grid-cols-2 gap-6">
                <DepositCard />
                <WithdrawCard onQrCodeGenerated={handleQrCodeGenerated} />
              </div>
            </TabsContent>

            <TabsContent value="history">
              <OperationsHistory />
            </TabsContent>
          </Tabs>
        </div>

        <QRCodeModal 
          isOpen={showQrCode} 
          onClose={() => setShowQrCode(false)}
          qrCodeUrl={qrCodeUrl}
        />
      </div>
    </div>
  );
};

export default Dashboard;
