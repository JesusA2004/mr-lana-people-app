import { useLocalSearchParams, useRouter } from 'expo-router';

import { documentosLaboralesApi } from '@/api/documentosLaborales';
import { SecureDocumentViewer } from '@/components/SecureDocumentViewer';
import { slugifyFilename } from '@/utils/formatters';

/**
 * Visor de un documento laboral propio (AGENTS.md de este encargo, sección
 * 20-21): sin watermark (es el propio documento del colaborador, no una
 * revisión RH), descarga solo si `puede_descargar` vino en `true` desde la
 * lista. No existe un endpoint de detalle por id en el contrato (solo
 * lista + ver + descargar) — el título/permiso de descarga viajan como
 * parámetros de navegación desde `documentos-laborales/index.tsx`.
 */
export default function DocumentoLaboralViewerScreen() {
  const router = useRouter();
  const { id, titulo, puedeDescargar } = useLocalSearchParams<{ id: string; titulo?: string; puedeDescargar?: string }>();

  return (
    <SecureDocumentViewer
      path={documentosLaboralesApi.verPath(id)}
      title={titulo ?? 'Documento'}
      onClose={() => router.back()}
      allowDownload={puedeDescargar === '1'}
      downloadFileName={titulo ? slugifyFilename(titulo) : undefined}
    />
  );
}
