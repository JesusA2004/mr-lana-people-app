import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { rhAltaApi } from '@/api/rh/alta';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice, Screen, SectionTitle } from '@/components/ciclo/Screen';
import { DateField } from '@/components/forms/DateField';
import { MoneyField } from '@/components/forms/MoneyField';
import { SelectField } from '@/components/forms/SelectField';
import { Input } from '@/components/Input';
import { Stepper } from '@/components/Stepper';
import { Colors, FontSize, Spacing } from '@/constants/colors';
import { retryUnlessClientError, SENSITIVE_MUTATION } from '@/hooks/queries/queryOptions';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from '@/store/toastStore';
import {
  ALTA_FORM_STEPS,
  buildAltaPayload,
  EMPTY_ALTA_FORM,
  erroresDelPaso,
  jefesPara,
  pasoDeCampo,
  puestosPara,
  requiereFechaFin,
  sucursalesPara,
  validarAlta,
  type AltaFormState,
} from '@/utils/altaForm';
import { confirmAction } from '@/utils/confirm';
import { getActionErrorMessage, getFieldError, getValidationErrors, logError } from '@/utils/errors';
import { formatCurrencyMXN } from '@/utils/formatters';
import { haptics } from '@/utils/haptics';

/**
 * Alta de colaborador (`POST /rh/colaboradores`, permiso
 * `colaboradores.alta`) en 3 pasos: datos personales → datos laborales →
 * contratación. Catálogos de `GET /rh/catalogos`, acotados al alcance de
 * quien captura; nunca se muestran IDs. El backend vuelve a validar todo y
 * sus errores regresan al paso del campo.
 */
export default function NuevoColaboradorScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const catalogos = useQuery({ queryKey: ['rh', 'catalogos'], queryFn: rhAltaApi.catalogos, retry: retryUnlessClientError, staleTime: 10 * 60_000 });
  const registrar = useMutation({ ...SENSITIVE_MUTATION, mutationFn: rhAltaApi.registrar });
  const [form, setForm] = useState<AltaFormState>(EMPTY_ALTA_FORM);
  const [localErrors, setLocalErrors] = useState<Partial<Record<string, string>>>({});
  const [paso, setPaso] = useState(0);

  const cat = catalogos.data;
  const set = <K extends keyof AltaFormState>(key: K, value: AltaFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const err = (field: string) => localErrors[field] ?? getFieldError(registrar.error, field);
  const conFechaFin = requiereFechaFin(cat, form.tipoContratacion);
  const ultimo = paso === ALTA_FORM_STEPS.length - 1;

  const siguiente = () => {
    const errores = erroresDelPaso(validarAlta(form, cat), paso);
    setLocalErrors(errores);
    if (Object.keys(errores).length > 0) {
      haptics.warning();
      return;
    }
    setPaso((p) => p + 1);
  };

  const guardar = async () => {
    const errores = validarAlta(form, cat);
    setLocalErrors(errores);
    const primero = Object.keys(errores)[0];
    if (primero) {
      haptics.warning();
      setPaso(pasoDeCampo(primero));
      return;
    }
    const sucursal = cat?.sucursales.find((s) => String(s.id) === form.sucursalId)?.nombre ?? '';
    const puesto = cat?.puestos.find((p) => String(p.id) === form.puestoId)?.nombre ?? '';
    const ok = await confirmAction({
      title: 'Dar de alta',
      message: `${[form.name, form.apellidos].filter(Boolean).join(' ')}\n${puesto} · ${sucursal}\nSueldo mensual: ${formatCurrencyMXN(form.sueldo)}${
        form.crearAcceso ? '\nSe creará su acceso a la app.' : ''
      }`,
      confirmLabel: 'Dar de alta',
    });
    if (!ok) return;

    registrar.mutate(buildAltaPayload(form, cat), {
      onSuccess: ({ colaboradorId }) => {
        haptics.success();
        toast.success('Colaborador dado de alta. Continúa con su expediente.');
        void queryClient.invalidateQueries({ queryKey: ['rh', 'colaboradores'] });
        router.replace(`/(app)/rh/colaboradores/${colaboradorId}` as never);
      },
      onError: (error) => {
        logError('rhAlta.registrar', error);
        haptics.error();
        const campo = Object.keys(getValidationErrors(error) ?? {})[0];
        if (campo) setPaso(pasoDeCampo(campo));
        toast.error(getActionErrorMessage(error));
      },
    });
  };

  return (
    <Screen title="Nuevo colaborador" isLoading={catalogos.isLoading} error={catalogos.error} onRetry={() => void catalogos.refetch()} form>
      <Stepper steps={ALTA_FORM_STEPS.map((s) => s.label)} currentIndex={paso} />
      {cat && cat.sucursales.length === 0 ? <Notice tone="warning">No tienes sucursales activas en tu alcance para dar de alta.</Notice> : null}

      {paso === 0 ? (
        <Card style={styles.section}>
          <SectionTitle>Datos personales</SectionTitle>
          <Input label="Nombre(s) *" value={form.name} onChangeText={(v) => set('name', v)} error={err('name')} autoCapitalize="words" />
          <Input label="Apellidos" value={form.apellidos} onChangeText={(v) => set('apellidos', v)} error={err('apellidos')} autoCapitalize="words" />
          {cat?.generos.length ? <SelectField label="Género" value={form.genero} options={cat.generos} onChange={(v) => set('genero', v)} error={err('genero')} /> : null}
          <Input label="Teléfono" value={form.telefono} onChangeText={(v) => set('telefono', v)} error={err('telefono')} keyboardType="phone-pad" maxLength={20} />
          <Input label="Correo" value={form.email} onChangeText={(v) => set('email', v)} error={err('email')} keyboardType="email-address" autoCapitalize="none" />
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Crear acceso a la app</Text>
              <Text style={styles.switchHint}>Recibirá su usuario en el correo capturado.</Text>
            </View>
            <Switch
              value={form.crearAcceso}
              onValueChange={(v) => set('crearAcceso', v)}
              trackColor={{ false: Colors.border, true: Colors.primarySoft }}
              thumbColor={form.crearAcceso ? Colors.primary : Colors.surface}
              accessibilityLabel="Crear acceso a la app"
            />
          </View>
          <Text style={styles.subheading}>Identificación (opcional)</Text>
          <DateField label="Fecha de nacimiento" value={form.fechaNacimiento} onChange={(d) => set('fechaNacimiento', d)} error={err('fecha_nacimiento')} />
          <Input label="CURP" value={form.curp} onChangeText={(v) => set('curp', v)} error={err('curp')} autoCapitalize="characters" maxLength={18} />
          <Input label="RFC" value={form.rfc} onChangeText={(v) => set('rfc', v)} error={err('rfc')} autoCapitalize="characters" maxLength={13} />
          <Input label="NSS" value={form.nss} onChangeText={(v) => set('nss', v)} error={err('nss')} keyboardType="number-pad" maxLength={11} />
        </Card>
      ) : null}

      {paso === 1 ? (
        <Card style={styles.section}>
          <SectionTitle>Datos laborales</SectionTitle>
          {(cat?.empresas.length ?? 0) > 1 ? (
            <SelectField
              label="Empresa"
              value={form.empresaId}
              options={(cat?.empresas ?? []).map((e) => ({ value: String(e.id), label: e.nombre }))}
              onChange={(v) => setForm((prev) => ({ ...prev, empresaId: v, sucursalId: '', jefeId: '' }))}
            />
          ) : null}
          <SelectField
            label="Sucursal *"
            value={form.sucursalId}
            options={sucursalesPara(cat, form.empresaId).map((s) => ({ value: String(s.id), label: s.nombre }))}
            onChange={(v) => setForm((prev) => ({ ...prev, sucursalId: v, jefeId: '' }))}
            error={err('sucursal_principal_id')}
          />
          <SelectField
            label="Departamento"
            value={form.departamentoId}
            options={(cat?.departamentos ?? []).map((d) => ({ value: String(d.id), label: d.nombre }))}
            onChange={(v) => setForm((prev) => ({ ...prev, departamentoId: v, puestoId: '' }))}
            error={err('departamento_id')}
          />
          <SelectField
            label="Puesto *"
            value={form.puestoId}
            options={puestosPara(cat, form.departamentoId).map((p) => ({ value: String(p.id), label: p.nombre }))}
            onChange={(v) => set('puestoId', v)}
            error={err('puesto_id')}
          />
          <SelectField
            label="Jefe inmediato"
            value={form.jefeId}
            options={jefesPara(cat, form.sucursalId).map((j) => ({ value: String(j.id), label: j.puesto ? `${j.nombre} · ${j.puesto}` : j.nombre }))}
            onChange={(v) => set('jefeId', v)}
            helper={form.sucursalId ? undefined : 'Elige primero la sucursal.'}
            error={err('jefe_id')}
          />
        </Card>
      ) : null}

      {paso === 2 ? (
        <Card style={styles.section}>
          <SectionTitle>Contratación</SectionTitle>
          <DateField label="Fecha de ingreso *" value={form.fechaIngreso} onChange={(d) => set('fechaIngreso', d)} error={err('fecha_ingreso')} />
          <SelectField
            label="Tipo de contrato *"
            value={form.tipoContratacion}
            options={(cat?.tipos_contratacion ?? []).map((t) => ({ value: t.value, label: t.label }))}
            onChange={(v) => set('tipoContratacion', v)}
            error={err('tipo_contratacion')}
          />
          {conFechaFin ? (
            <DateField label="Vencimiento del contrato *" value={form.fechaFinContrato} onChange={(d) => set('fechaFinContrato', d)} error={err('fecha_fin_contrato')} />
          ) : null}
          <MoneyField label="Sueldo mensual *" value={form.sueldo} onChange={(v) => set('sueldo', v)} error={err('sueldo_mensual')} />
          <Input label="Número de empleado" value={form.numeroEmpleado} onChangeText={(v) => set('numeroEmpleado', v)} error={err('numero_empleado')} maxLength={30} />
        </Card>
      ) : null}

      {isOffline ? <Notice tone="warning">Sin conexión: el alta requiere confirmación del servidor.</Notice> : null}
      <View style={styles.actions}>
        {paso > 0 ? <Button title="Atrás" variant="outline" fullWidth={false} style={styles.action} onPress={() => setPaso((p) => p - 1)} /> : null}
        {ultimo ? (
          <Button
            title="Dar de alta"
            leftIcon="person-add-outline"
            fullWidth={false}
            style={styles.action}
            onPress={() => void guardar()}
            loading={registrar.isPending}
            disabled={isOffline || registrar.isPending}
          />
        ) : (
          <Button title="Siguiente" rightIcon="arrow-forward" fullWidth={false} style={styles.action} onPress={siguiente} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  subheading: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  switchText: {
    flex: 1,
    minWidth: 0,
  },
  switchLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  switchHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  action: {
    flexGrow: 1,
    flexBasis: 130,
  },
});
