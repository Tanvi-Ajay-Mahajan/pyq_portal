import { useEffect, useState } from 'react';
import type { AcademicYear, Branch, Scheme, Semester, Subject } from '@/types';
import { fetchReferenceData } from '@/services/referenceService';

interface ReferenceState {
  branches: Branch[];
  schemes: Scheme[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  subjects: Subject[];
  loading: boolean;
  error: string | null;
}

const EMPTY: ReferenceState = {
  branches: [],
  schemes: [],
  academicYears: [],
  semesters: [],
  subjects: [],
  loading: true,
  error: null,
};

/** Loads branches/schemes/years/semesters/subjects from the Express API. */
export function useReferenceData() {
  const [state, setState] = useState<ReferenceState>(EMPTY);

  useEffect(() => {
    let active = true;

    fetchReferenceData()
      .then((data) => {
        if (!active) return;
        setState({
          branches: data.branches ?? [],
          schemes: data.schemes ?? [],
          academicYears: data.academicYears ?? [],
          semesters: data.semesters ?? [],
          subjects: data.subjects ?? [],
          loading: false,
          error: null,
        });
      })
      .catch((error: Error) => {
        if (!active) return;
        setState({ ...EMPTY, loading: false, error: error.message });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

export default useReferenceData;
