import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonthlyReport {
  id: string;
  owner_id: string;
  concierge_user_id: string;
  period_month: string;
  total_bookings: number;
  total_nights: number;
  available_nights: number;
  occupancy_rate: number;
  adr: number;
  gross_revenue: number;
  owner_net: number;
  total_interventions: number;
  total_photos: number;
  payload: any;
  pdf_path: string | null;
  status: 'generated' | 'sent' | 'error';
  email_sent_at: string | null;
  generated_at: string;
}

export function useMonthlyReports(ownerId?: string) {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from('monthly_reports').select('*').order('period_month', { ascending: false });
    if (ownerId) q = q.eq('owner_id', ownerId);
    const { data, error } = await q;
    if (!error) setReports((data as MonthlyReport[]) || []);
    setLoading(false);
  }, [ownerId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const generateReport = async (params: { owner_id?: string; period?: string; force?: boolean } = {}) => {
    const tid = toast.loading('Génération du rapport en cours…');
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-report', { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data?.generated || 0} rapport(s) généré(s)`, { id: tid });
      await fetchReports();
      return data;
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la génération', { id: tid });
      return null;
    }
  };

  const downloadReport = async (report: MonthlyReport) => {
    if (!report.pdf_path) { toast.error('Aucun fichier disponible'); return; }
    const { data, error } = await supabase.storage
      .from('owner-documents')
      .createSignedUrl(report.pdf_path, 3600);
    if (error || !data) { toast.error('Erreur téléchargement'); return; }
    window.open(data.signedUrl, '_blank');
  };

  return { reports, loading, generateReport, downloadReport, refetch: fetchReports };
}
