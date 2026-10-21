import type { File } from 'expo-file-system';
import { useCallback } from 'react';
import { Modal } from 'react-native';

import { SecureDocumentViewer } from './SecureDocumentViewer';

import { cartaCompromisoApi } from '@/api/cartaCompromiso';
import { slugifyFilename } from '@/utils/formatters';

export type VisorCartaCompromiso =
  /** Vista previa ANTES de terminar el registro (`POST carta-compromiso/vista-previa`). */
  | { tipo: 'vista-previa'; documentos: number[] }
  /** Carta ya generada (`GET carta-compromiso/pdf`), con descarga. */
  | { tipo: 'carta'; folio?: string | null };

/**
 * Visor a pantalla completa de la carta compromiso de documentos
 * pendientes. Reutiliza `SecureDocumentViewer` (descarga autenticada,
 * visor PDF de iOS/Android, «Descargar PDF / Abrir con…»). La vista previa
 * es un POST, así que se le pasa su propia forma de descargar.
 */
export function CartaCompromisoVisor({ visor, onClose }: { visor: VisorCartaCompromiso | null; onClose: () => void }) {
  return (
    <Modal visible={visor !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {visor?.tipo === 'vista-previa' ? (
        <VistaPrevia documentos={visor.documentos} onClose={onClose} />
      ) : visor?.tipo === 'carta' ? (
        <SecureDocumentViewer
          path={cartaCompromisoApi.pdfPath()}
          title={visor.folio ? `Carta compromiso ${visor.folio}` : 'Carta compromiso'}
          onClose={onClose}
          allowDownload
          downloadFileName={slugifyFilename(`carta-compromiso-${visor.folio ?? 'documentos'}`)}
        />
      ) : null}
    </Modal>
  );
}

function VistaPrevia({ documentos, onClose }: { documentos: number[]; onClose: () => void }) {
  const clave = documentos.join(',');
  const descargar = useCallback(
    (destino: File, signal: AbortSignal) => cartaCompromisoApi.vistaPrevia(
        clave
          .split(',')
          .map(Number)
          .filter((id) => id > 0),
        destino,
        signal,
      ),
    [clave],
  );

  return (
    <SecureDocumentViewer
      path={`/colaborador/carta-compromiso/vista-previa?documentos=${clave}`}
      title="Vista previa de tu carta compromiso"
      onClose={onClose}
      descargar={descargar}
    />
  );
}
