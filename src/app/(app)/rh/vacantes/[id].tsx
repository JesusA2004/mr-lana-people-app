import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/ciclo/InfoRow';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { useRhVacante } from '@/hooks/queries/useRhCicloLaboral';
import { formatDateLong } from '@/utils/dates';

/**
 * Detalle de vacante — `GET /rh/vacantes/{id}` (solo lectura; la edición
 * de vacantes no existe en la API móvil). `dias_abierta` lo calcula el
 * backend (`Vacante::diasAbierta()`).
 */
export default function RhVacanteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useRhVacante(id);
  const vacante = query.data;

  return (
    <Screen
      title="Vacante"
      subtitle="Solo lectura"
      isLoading={query.isLoading}
      error={query.error}
      notFoundMessage="Esta vacante ya no está disponible."
      onRetry={() => void query.refetch()}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}>
      {vacante ? (
        <>
          <Card>
            <SectionTitle>{vacante.puesto ?? 'Puesto'}</SectionTitle>
            <InfoRow label="Empresa" value={vacante.empresa} />
            <InfoRow label="Sucursal" value={vacante.sucursal} />
            <InfoRow label="Estado" value={vacante.estado} />
            <InfoRow label="Motivo" value={vacante.motivo} />
            <InfoRow label="Apertura" value={formatDateLong(vacante.fecha_apertura)} />
            <InfoRow label="Cierre" value={formatDateLong(vacante.fecha_cierre)} />
            <InfoRow label="Días abierta" value={vacante.dias_abierta} emphasis />
          </Card>
          <Card>
            <SectionTitle>Plazas</SectionTitle>
            <InfoRow label="Requeridas" value={vacante.plazas_requeridas} />
            <InfoRow label="Cubiertas" value={vacante.plazas_cubiertas} />
            <InfoRow label="Disponibles" value={vacante.plazas_disponibles} />
          </Card>
          {vacante.candidato_contratado || vacante.colaborador_contratado ? (
            <Card>
              <SectionTitle>Contratación</SectionTitle>
              <InfoRow label="Candidato contratado" value={vacante.candidato_contratado} />
              <InfoRow label="Colaborador" value={vacante.colaborador_contratado?.nombre} />
              {vacante.colaborador_contratado ? (
                <Button
                  title="Ver colaborador"
                  variant="ghost"
                  onPress={() => router.push(`/(app)/rh/colaboradores/${vacante.colaborador_contratado?.id}` as never)}
                />
              ) : null}
            </Card>
          ) : null}
          <Notice tone="info">La gestión de vacantes y candidatos se realiza en el Portal RH.</Notice>
        </>
      ) : null}
    </Screen>
  );
}
