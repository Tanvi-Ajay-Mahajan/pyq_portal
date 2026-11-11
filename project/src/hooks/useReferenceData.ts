import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ReferenceData } from '@/types';

export function useReferenceData() {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branches, schemes, academicYears, semesters] = await Promise.all([
        supabase.from('branches').select('id, code, name').order('name'),
        supabase.from('schemes').select('id, name').order('name'),
        supabase.from('academic_years').select('id, year').order('year', { ascending: false }),
        supabase.from('semesters').select('id, number, label').order('number'),
      ]);

      const errors = [branches.error, schemes.error, academicYears.error, semesters.error].filter(Boolean);
      if (errors.length) throw errors[0];

      setData({
        branches: branches.data as never,
        schemes: schemes.data as never,
        academicYears: academicYears.data as never,
        semesters: semesters.data as never,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reference data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
