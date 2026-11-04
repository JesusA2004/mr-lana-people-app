import { TarjetaAviso } from '@/components/ui';
import { useBloqueoExpediente } from '@/hooks/queries/useGuia';
import { openCrossExperienceRoute } from '@/utils/crossNavigation';

/**
 * En Gestión RH (modo operativo) el bloqueo del expediente NUNCA detiene la
 * operación (aprobar, equipo, RH): solo se le recuerda a la persona su
 * PROPIO pendiente y se le lleva a Mi espacio para completarlo.
 */
export function AvisoMiExpedienteRh() {
  const estado = useBloqueoExpediente();
  if (!estado.bloqueado) return null;

  return (
    <TarjetaAviso
      icono="id-card-outline"
      tono="aviso"
      titulo="Tu propio expediente está incompleto"
      mensaje={`${estado.mensaje ?? 'Completa tu expediente.'} Tu equipo y tus aprobaciones siguen funcionando normal.`}
      accion="Completar en Mi espacio"
      onPress={() => openCrossExperienceRoute('/siguiente-paso', 'colaborador')}
    />
  );
}
