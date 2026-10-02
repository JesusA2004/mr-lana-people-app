import { useRouter } from 'expo-router';

import { ItemCard } from '@/components/ciclo/ItemCard';
import { EmptyMessage, Notice, Screen } from '@/components/ciclo/Screen';
import { useMiProceso } from '@/hooks/queries/useCicloLaboral';
import type { LeccionEstado } from '@/types/miProceso';
import { etiquetaEstadoLeccion, formatoCalificacion } from '@/utils/miProceso';

const STATUS: Record<LeccionEstado, 'aprobada' | 'en_revision' | 'pendiente' | 'rechazada'> = {
  aprobada: 'aprobada',
  disponible: 'pendiente',
  en_espera: 'en_revision',
  bloqueada: 'pendiente',
};

/**
 * Lecciones de bienvenida (inducción + módulos del puesto). Lista y estados
 * vienen tal cual de `GET /colaborador/mi-proceso`; la regla de aprobación
 * (mínimo 8, refuerzo de RH, reintento) vive en el backend.
 */
export default function LeccionesScreen() {
  const router = useRouter();
  const query = useMiProceso();
  const lecciones = query.data?.lecciones ?? [];

  return (
    <Screen
      title="Lecciones de bienvenida"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Tu cuenta todavía no está vinculada a un expediente de colaborador."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {lecciones.length === 0 ? (
        <EmptyMessage message="No tienes lecciones pendientes. Cuando Recursos Humanos te asigne una, aparecerá aquí." />
      ) : (
        <>
          <Notice tone="info">Revisa el material de cada lección y responde sus preguntas. Necesitas 8 o más para aprobarla.</Notice>
          {lecciones.map((leccion) => (
            <ItemCard
              key={leccion.avanceId}
              icon="school-outline"
              title={leccion.titulo}
              subtitle={leccion.descripcion ?? undefined}
              lines={[
                leccion.calificacion !== null ? `Tu mejor calificación: ${formatoCalificacion(leccion.calificacion)}` : null,
                leccion.retroalimentacion ? `Comentario de RH: ${leccion.retroalimentacion}` : null,
              ]}
              status={STATUS[leccion.estado]}
              statusLabel={etiquetaEstadoLeccion(leccion.estado)}
              onPress={
                leccion.estado === 'bloqueada'
                  ? undefined
                  : () => router.push({ pathname: '/lecciones/[avanceId]', params: { avanceId: String(leccion.avanceId) } })
              }
            />
          ))}
        </>
      )}
    </Screen>
  );
}
