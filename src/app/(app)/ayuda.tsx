import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { FadeInView } from '@/components/FadeInView';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Layout, Radius, Spacing } from '@/constants/colors';

interface Faq {
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    question: '¿Cómo solicito vacaciones?',
    answer:
      'Ve a la pestaña "Vacaciones" y toca "Solicitar vacaciones". Elige tus fechas y envía la solicitud; Recursos Humanos la revisará y verás el estatus en tu historial.',
  },
  {
    question: '¿Cómo creo una nueva solicitud?',
    answer:
      'Desde Inicio o desde la pestaña "Solicitudes" toca el botón de nueva solicitud, elige el tipo de trámite, describe el motivo y confírmalo. Puedes seguir su avance en cualquier momento.',
  },
  {
    question: '¿Cómo sé si aprobaron mi solicitud?',
    answer:
      'Recibirás una notificación y podrás ver el estado actualizado (Aprobada, Rechazada, En revisión, etc.) en el detalle de la solicitud dentro de "Mis solicitudes".',
  },
  {
    question: '¿Qué hago si rechazaron un documento o solicitud?',
    answer:
      'Revisa la observación de Recursos Humanos en el detalle correspondiente. Si es un documento, toca "Subir documento" para reemplazarlo (o "Solicitar cambio" si ya estaba en revisión/aprobado); si es una solicitud, crea una nueva del tipo adecuado.',
  },
  {
    question: '¿Cómo subo un documento de mi expediente?',
    answer:
      'Ve al tab "Expediente", toca el documento que quieres cargar y elige "Subir documento". Puedes tomar una foto, elegir una de tu galería o subir un PDF — verás el progreso real de la subida.',
  },
  {
    question: '¿Quién puede ver mi información?',
    answer:
      'Solo tú y el personal autorizado de Recursos Humanos. Los documentos no se pueden capturar en pantalla y la app se bloquea si la dejas un rato sin usar.',
  },
];

const QUICK_LINKS: { icon: keyof typeof Ionicons.glyphMap; label: string; description: string; path: Parameters<ReturnType<typeof useRouter>['push']>[0] }[] = [
  { icon: 'home-outline', label: 'Inicio', description: 'Resumen de todo', path: '/(app)/(tabs)' },
  { icon: 'folder-open-outline', label: 'Expediente', description: 'Tus documentos', path: '/(app)/(tabs)/expediente' },
  { icon: 'document-text-outline', label: 'Solicitudes', description: 'Permisos y trámites', path: '/(app)/(tabs)/solicitudes' },
  { icon: 'airplane-outline', label: 'Vacaciones', description: 'Días disponibles', path: '/(app)/(tabs)/vacaciones' },
  { icon: 'person-outline', label: 'Perfil', description: 'Tus datos', path: '/(app)/(tabs)/perfil' },
  { icon: 'briefcase-outline', label: 'Incorporación', description: 'Tu proceso de alta', path: '/incorporacion' },
];

export default function AyudaScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View style={styles.container}>
      <AppHeader title="Ayuda" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView index={0}>
          <Card style={styles.guideCard} onPress={() => router.push('/guia')}>
            <MascotAvatar orientation="right" size="sm" />
            <View style={styles.guideText}>
              <Text style={styles.guideTitle}>¿Nuevo por aquí?</Text>
              <Text style={styles.guideSubtitle}>Recorre la guía de la app en un minuto.</Text>
            </View>
            <View style={styles.guideCta}>
              <Text style={styles.guideCtaText}>Ver guía</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primaryDark} />
            </View>
          </Card>
        </FadeInView>

        <FadeInView index={1}>
          <Text style={styles.sectionTitle}>Explora la app</Text>
          <View style={styles.quickGrid}>
            {QUICK_LINKS.map((link) => (
              <PressableScale key={link.label} onPress={() => router.push(link.path)} style={styles.quickCard}>
                <View style={styles.quickIcon}>
                  <Ionicons name={link.icon} size={20} color={Colors.primaryDark} />
                </View>
                <Text style={styles.quickLabel}>{link.label}</Text>
                <Text style={styles.quickDescription}>{link.description}</Text>
              </PressableScale>
            ))}
          </View>
        </FadeInView>

        <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
        <View style={styles.list}>
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <Card key={faq.question} padded={false} style={styles.faqCard}>
                <PressableScale haptic={false} onPress={() => setOpenIndex(open ? null : index)} style={styles.faqHeader}>
                  <View style={styles.faqIcon}>
                    <Ionicons name="help-circle-outline" size={18} color={Colors.primaryDark} />
                  </View>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                </PressableScale>
                {open ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
              </Card>
            );
          })}
        </View>

        <FadeInView index={2}>
          <Card style={styles.privacyCard}>
            <View style={styles.privacyHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.privacyTitle}>Privacidad</Text>
            </View>
            <Text style={styles.privacyText}>
              Tus datos y documentos solo los ven tú y el personal autorizado de Recursos Humanos. No compartimos tu información con
              terceros. Si dejas la app un rato sin usar, te pedimos confirmar tu identidad al volver.
            </Text>
          </Card>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  guideText: {
    flex: 1,
    minWidth: 0,
  },
  guideTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  guideSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  guideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  guideCtaText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: 2,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.text,
  },
  quickDescription: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  list: {
    gap: Spacing.sm,
  },
  faqCard: {
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  faqIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  faqQuestion: {
    flex: 1,
    minWidth: 0,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  faqAnswer: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingLeft: 56,
    lineHeight: 20,
  },
  privacyCard: {
    gap: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primarySoft,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  privacyTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  privacyText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
});
