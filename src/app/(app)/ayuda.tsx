import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/Card';
import { PressableScale } from '@/components/PressableScale';
import { Colors, FontSize, Radius, Spacing } from '@/constants/colors';

interface Faq {
  question: string;
  answer: string;
}

/** Contenido local (AGENTS.md sección 46: "no crear un chat, puede ser contenido local"). */
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
      'Revisa el motivo indicado por Recursos Humanos en el detalle correspondiente. Si necesitas corregir información, crea una nueva solicitud del tipo adecuado (por ejemplo, "Actualización de datos") o contacta directamente a RH.',
  },
  {
    question: '¿Cuándo podré subir documentos de mi expediente desde la app?',
    answer:
      'Esta función está en desarrollo. Por ahora, Recursos Humanos sigue gestionando la carga y validación de tu expediente; te avisaremos en cuanto esté disponible desde la app.',
  },
];

export default function AyudaScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View style={styles.container}>
      <AppHeader title="Ayuda" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Encuentra respuesta a las dudas más comunes sobre la app.</Text>

        <View style={styles.list}>
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <Card key={faq.question} padded={false} style={styles.faqCard}>
                <PressableScale
                  haptic={false}
                  onPress={() => setOpenIndex(open ? null : index)}
                  style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                </PressableScale>
                {open ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
              </Card>
            );
          })}
        </View>

        <Text style={styles.privacyTitle}>Privacidad</Text>
        <Text style={styles.privacyText}>
          Tu información laboral y personal se consulta directamente desde los sistemas de MR. LANA PEOPLE mediante
          conexión segura (HTTPS) y tu sesión se protege con un token cifrado en tu dispositivo. No compartimos tu
          información con servicios externos ajenos a la plataforma.
        </Text>
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
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  intro: {
    fontSize: FontSize.sm,
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
    justifyContent: 'space-between',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  faqAnswer: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    lineHeight: 20,
  },
  privacyTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  privacyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  radius: {
    borderRadius: Radius.lg,
  },
});
