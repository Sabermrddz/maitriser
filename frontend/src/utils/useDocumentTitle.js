import { useEffect } from 'react';

export default function useDocumentTitle(title, suffix = 'MAITRISEZ') {
  useEffect(() => {
    document.title = title ? `${title} — ${suffix}` : 'MAITRISEZ';
  }, [title, suffix]);
}
