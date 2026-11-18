import type { File } from 'expo-file-system';
import { useCallback } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';
import { DocumentoProtegido } from './DocumentoProtegido';
import { SecureDocumentViewer } from './SecureDocumentViewer';

import { cartaCompromisoApi } from '@/api/cartaCompromiso';
import { Notice } from '@/components/ciclo/Screen';
import { Spacing, type ColorPalette } from '@/constants/colors';
import { usePermisos } from '@/hooks/usePermisos';
import { useEstilos } from '@/theme/ThemeProvider';

export type VisorCartaCompromiso =
  /** Vista previa ANTES de terminar el registro (`POST carta-compromiso/vista-previa`). */
  | { tipo: 'vista-previa'; documentos: number[] }
  /** Carta ya generada (`GET carta-compromiso/pdf`), con descarga. */
  | { tipo: 'carta'; folio?: string | null; puedeDescargar?: boolean };

/**
 * Carta compromiso de documentos pendientes, a pantalla completa:
 * - `carta` (ya generada): tarjeta de descarga, sin visor embebido.
 * - `vista-previa` (POST, borrador antes de terminar el registro): solo
 *   consulta, con el visor seguro; todavía no es un documento que se entregue.
 */
export function CartaCompromisoVisor({ visor, onClose }: { visor: VisorCartaCompromiso | null; onClose: () => void }) {
  return (
    <Modal visible={visor !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {visor?.tipo === 'vista-previa' ? <VistaPrevia documentos={visor.documentos} onClose={onClose} /> : visor?.tipo === 'carta' ? <CartaGenerada folio={visor.folio} puedeDescargar={visor.puedeDescargar === true} onClose={onClose} /> : null}
    </Modal>
  );
}

function CartaGenerada({ folio, puedeDescargar, onClose }: { folio?: string | null; puedeDescargar: boolean; onClose: () => void }) {
  const styles = useEstilos(crearEstilos);
  // `app.carta_compromiso.ver` (`permisos_app`; ausente = como siempre).
  const puedeVer = usePermisos().app('app.carta_compromiso.ver');
  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.cerrar}>
        <Button title="Cerrar" variant="ghost" leftIcon="close" fullWidth={false} onPress={onClose} />
      </View>
      {puedeVer ? (
        <DocumentoProtegido titulo={folio ? `Carta compromiso ${folio}` : 'Carta compromiso'} modo="descarga" path={cartaCompromisoApi.pdfPath()} puedeDescargar={puedeDescargar} />
      ) : (
        <Notice tone="info">No tienes permiso para ver tu carta compromiso en la app. Si la necesitas, pídesela a Recursos Humanos.</Notice>
      )}
    </SafeAreaView>
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

const crearEstilos = (Colors: ColorPalette) =>
  StyleSheet.create({
    pantalla: { flex: 1, padding: Spacing.lg, gap: Spacing.lg, backgroundColor: Colors.background },
    cerrar: { alignItems: 'flex-end' },
  });
