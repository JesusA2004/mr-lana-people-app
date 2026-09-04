/**
 * Catálogo de mensajes de la mascota (AGENTS.md sección 6). Centralizarlos
 * aquí evita copys distintos para la misma situación en pantallas distintas.
 */
export const MascotMessages = {
  bienvenida: (nombre?: string) =>
    `¡Hola${nombre ? `, ${nombre}` : ''}! 👋 Soy tu asistente de MR. LANA PEOPLE. Te ayudaré a completar tu información y realizar tus trámites.`,
  perfilIncompleto: 'Tu perfil está casi listo. Solo faltan algunos datos.',
  documentosPendientes: (cantidad: number) =>
    `Te faltan ${cantidad} ${cantidad === 1 ? 'documento' : 'documentos'} para completar tu expediente.`,
  vacaciones: 'Aquí puedes consultar tus días disponibles y solicitar vacaciones.',
  nuevaSolicitud: 'Elige el tipo de trámite y te mostraré exactamente qué información necesitamos.',
  solicitudEnviada: '¡Listo! Tu solicitud fue enviada. Puedes revisar su avance desde Mis solicitudes.',
  documentoRechazado: 'Este documento necesita una corrección. Revisa la observación de Recursos Humanos.',
  expedienteCompleto: '¡Excelente! Tu expediente está completo y listo para revisión.',
  pendienteAprobacion: 'Tu expediente ya fue enviado. Ahora está esperando validación.',
  wizardTipo: 'Selecciona qué tipo de trámite deseas realizar.',
  wizardMotivo: 'Ahora cuéntanos el motivo.',
  wizardRevision: 'Revisa los datos antes de enviar.',
  expedienteProximamente:
    'Muy pronto podrás cargar y dar seguimiento a tus documentos desde aquí. Por ahora, Recursos Humanos sigue gestionando tu expediente.',
  todoTranquilo: 'Todo tranquilo por aquí.',
  estasAlDia: '¡Estás al día!',
} as const;
