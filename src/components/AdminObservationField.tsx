
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminObservationFieldProps {
  operationId: string;
  currentNotes?: string | null;
  onNotesUpdate?: (notes: string) => void;
  isCompact?: boolean;
}

const AdminObservationField = ({ 
  operationId, 
  currentNotes, 
  onNotesUpdate,
  isCompact = false 
}: AdminObservationFieldProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState(currentNotes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('operations')
        .update({ 
          notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) throw error;

      onNotesUpdate?.(notes);
      setIsEditing(false);
      
      toast({
        title: "Observação salva!",
        description: "A observação foi atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar observação.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (isCompact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">Observação Admin:</span>
        </div>
        {!isEditing ? (
          <div className="flex items-start gap-2">
            <div className="flex-1 text-sm text-muted-foreground min-h-[20px]">
              {notes || 'Nenhuma observação'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="h-7 px-2"
            >
              Editar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicionar observação administrativa..."
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={saving}
                className="h-7"
              >
                <Save size={14} className="mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNotes(currentNotes || '');
                  setIsEditing(false);
                }}
                className="h-7"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={16} />
            <span className="font-medium">Observação Administrativa</span>
          </div>
          
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicionar observação sobre esta operação..."
            className="min-h-[80px]"
          />
          
          <Button
            onClick={handleSaveNotes}
            disabled={saving || notes === (currentNotes || '')}
            className="w-full"
          >
            <Save size={16} className="mr-2" />
            {saving ? 'Salvando...' : 'Salvar Observação'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminObservationField;
