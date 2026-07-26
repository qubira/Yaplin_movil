const es = {
  common: {
    actions: {
      cancel: 'Cancelar',
      save: 'Guardar',
      saving: 'Guardando...',
      close: 'Cerrar',
      delete: 'Eliminar',
      back: 'Volver',
      configure: 'Configurar',
      connect: 'Conectar',
      connected: 'Conectado',
    },
    form: {
      name: 'Nombre',
    },
    roles: {
      owner: 'Dueño',
      supervisor: 'Supervisor',
      cajero: 'Cajero',
    },
    fallback: {
      unassigned: 'Sin asignar',
      noEmail: 'Sin email',
    },
    months: {
      abbr: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      full: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    },
    noPaymentsInPeriod: 'Sin pagos en este período',
  },

  settings: {
    languageSection: 'Idioma',
    languageComingSoon: 'Próximamente',
    section: {
      myBusiness: 'Mi negocio',
      battery: 'Batería',
      notifications: 'Notificaciones',
      integrations: 'Integraciones',
      account: 'Cuenta',
      about: 'Acerca de',
    },
    myBusiness: {
      owner: 'Dueño',
      plan: 'Plan',
      expires: 'Vence',
      defaultStore: 'Tienda predeterminada',
      unassigned: 'Sin asignar',
      defaultStoreHint: 'Los pagos que este celular capture se suman a la tienda predeterminada.',
    },
    battery: {
      captureActiveLabel: 'Captura activa',
      ignoreOptimization: 'Ignorar optimización de batería',
      xiaomiAutostart: 'Inicio automático (Xiaomi)',
      hintActive: 'YapLin revisa pagos nuevos cada 5 segundos y escucha las notificaciones de Yape/Plin/Izipay. Activa "Ignorar optimización de batería" (y "Inicio automático" si tu celular es Xiaomi) para que Android no lo apague solo tras un rato.',
      hintPaused: 'Captura en pausa: no se sincroniza ni se leen notificaciones de pago. Actívalo antes de empezar a atender.',
    },
    notifications: {
      push: 'Notificaciones push',
      voiceAlert: 'Alerta de voz',
    },
    integrations: {
      androidOnly: 'La captura automática de pagos solo está disponible en Android.',
      bankCount: (n: number) => `${n} banco${n !== 1 ? 's' : ''}`,
      permissionWarning: 'Al conectar se abrirán los Ajustes de Android para dar acceso a notificaciones a YapLin. Vuelve a la app después de activarlo.',
    },
    account: {
      logout: 'Cerrar sesión',
    },
    about: {
      version: 'Versión',
      channel: 'Canal',
      update: 'Actualización',
    },
    plinModal: {
      title: 'Plin por banco',
      description: 'Plin no es una app propia: viene dentro de la app de tu banco. Activa los bancos desde los que recibes pagos por Plin.',
      done: 'Listo',
    },
    storeModal: {
      title: 'Tienda predeterminada',
      description: 'Este celular solo puede tener una cuenta de Yape/Plin/Izipay conectada. Todo pago capturado se suma a la tienda que elijas aquí.',
    },
  },

  dashboard: {
    greeting: 'Buenos días',
    weekAbbr: 'Sem',
    periods: {
      today: 'Hoy',
      day: 'Día',
      week: 'Semana',
      month: 'Mes',
    },
    totalReceived: 'Total recibido',
    recentPayments: 'Últimos pagos',
    periodPayments: 'Pagos del período',
    viewAll: 'Ver todos',
    transactionsCount: (n: number) => `${n} transacciones`,
    allPayments: 'Todos los pagos',
    periodTotal: 'Total del período',
    paymentsCount: (n: number) => `${n} pago${n !== 1 ? 's' : ''}`,
    transactionsLabel: 'Transacciones',
    resultsCount: (n: number) => `${n} resultados`,
    picker: {
      selectDay: 'Seleccionar día',
      selectWeek: 'Seleccionar semana',
      selectMonth: 'Seleccionar mes',
      viewDay: (day: number, month: string, year: number) => `Ver ${day} ${month} ${year}`,
      weekN: (n: number) => `Semana ${n}`,
    },
  },

  team: {
    header: {
      title: 'Mi equipo',
      subtitle: (active: number, total: number) => `${active} activos · ${total} total`,
    },
    roles: {
      ownerDesc: 'Acceso completo a todas las tiendas y configuraciones',
      supervisorDesc: 'Ver y gestionar pagos de su tienda asignada',
      cajeroDesc: 'Solo recibe notificaciones de cobros de su tienda',
    },
    permissions: {
      viewAllStores: 'Ver todas las tiendas',
      addEditMembers: 'Agregar/editar miembros',
      reconciliationReports: 'Conciliación y reportes',
      accountSettings: 'Configuración de cuenta',
      receiveNotifications: 'Recibir notificaciones',
    },
    inactiveLabel: 'Inactivo',
    accessLevelsTitle: 'Niveles de acceso',
    matrix: {
      permission: 'Permiso',
      supervisorAbbr: 'Sup.',
    },
    membersTitle: 'Miembros',
    allStores: 'Todas las tiendas',
    storeAssignedLabel: 'Tienda asignada',
    deleteAlert: {
      title: 'Eliminar miembro',
      message: (name: string) => `¿Eliminar a "${name}" del equipo?`,
    },
    memberDetailTitle: 'Detalle del miembro',
    activeMemberLabel: 'Miembro activo',
    permissionsTitle: 'Permisos',
    addMemberTitle: 'Agregar miembro',
    editMemberTitle: 'Editar miembro',
    form: {
      namePlaceholder: 'Ana Torres',
      emailLabel: 'Email',
      emailPlaceholder: 'ana@negocio.com',
      passwordLabelEdit: 'Nueva contraseña (dejar en blanco para no cambiarla)',
      passwordLabelNew: 'Contraseña',
      passwordPlaceholder: 'Mínimo 6 caracteres',
      roleSectionTitle: 'Rol',
      saveError: 'No se pudo guardar. Intenta de nuevo.',
    },
  },

  stores: {
    header: {
      title: 'Mis tiendas',
      subtitle: (active: number, total: number) => `${active} activas · ${total} total`,
    },
    noAddress: 'Sin dirección',
    noAccount: 'Sin cuenta',
    status: {
      active: 'Activa',
      inactive: 'Inactiva',
    },
    stats: {
      today: 'Hoy',
      thisMonth: 'Este mes',
      payments: 'Pagos',
    },
    summary: {
      totalToday: 'Total consolidado hoy',
      thisMonthAmount: (amount: string) => `${amount} este mes`,
      activeStores: 'Tiendas activas',
      paymentsToday: 'Pagos hoy',
      team: 'Equipo',
    },
    sectionTitle: 'Tiendas',
    revenueLabel: 'Ingresos',
    notificationAccountLabel: 'Cuenta de notificaciones',
    assignedTeamLabel: 'Equipo asignado',
    paymentMethodsLabel: 'Métodos de pago',
    addStoreTitle: 'Agregar tienda',
    editStoreTitle: 'Editar tienda',
    deleteAlert: {
      cannotDeleteTitle: 'No se puede eliminar',
      cannotDeleteMessage: 'Debe existir al menos una tienda.',
      title: 'Eliminar tienda',
      message: (name: string) => `¿Eliminar "${name}"? Esta acción no se puede deshacer.`,
    },
    form: {
      namePlaceholder: 'Tienda Principal',
      addressLabel: 'Dirección',
      addressPlaceholder: 'Jr. Comercio 123',
      accountPlaceholder: 'tienda@negocio.com',
    },
  },

  transaction: {
    notFound: 'Esta transacción ya no está disponible.',
    confirmed: 'Confirmado',
    via: (label: string) => `vía ${label}`,
    detailTitle: 'Detalle del pago',
    detail: {
      date: 'Fecha',
      time: 'Hora',
      reference: 'Referencia',
      method: 'Medio de pago',
      status: 'Estado',
    },
    payerSummaryTitle: 'Resumen del cliente',
    payerSummary: (count: number, totalAmount: string) => `${count} pagos · ${totalAmount} total`,
    historyTitle: 'Historial de pagos',
    viewMore: 'Ver más',
    shareReceipt: 'Compartir comprobante',
    reportProblem: 'Reportar problema',
    shareMessage: (payerName: string, amount: string, method: string, reference: string, date: string, time: string) =>
      `Comprobante YapLin\n${payerName} pagó ${amount} vía ${method}\nRef: ${reference}\nFecha: ${date} ${time}`,
    reportEmail: {
      subject: (reference: string) => `Reporte de problema - Pago ${reference}`,
      businessLine: (businessName: string, storeName: string) => `Negocio: ${businessName} — Tienda: ${storeName}`,
      methodLine: (method: string) => `Método de pago: ${method}`,
      amountLine: (amount: string) => `Monto: ${amount}`,
      dateLine: (date: string, time: string) => `Fecha y hora: ${date} ${time}`,
      referenceLine: (reference: string) => `Referencia: ${reference}`,
      reportedByLine: (name: string, email: string) => `Reportado por: ${name} (${email})`,
      descriptionLabel: 'Descripción del problema:',
      descriptionPlaceholder: '(escribe aquí los detalles)',
    },
    accumulatedAmount: 'Monto acumulado',
    paymentsCount: (n: number) => `${n} pago${n !== 1 ? 's' : ''}`,
    percentOfTotal: (pct: number) => `${pct}% del total`,
    filterAll: 'Todos',
    noMailApp: {
      title: 'No encontramos una app de correo',
      description: 'Escribe directamente a soporte con los detalles de este pago:',
    },
  },

  auth: {
    login: {
      missingFields: 'Ingresa tu email y contraseña',
      connectionError: 'No se pudo conectar al servidor',
      tagline: 'Notificaciones de pago en tiempo real',
      welcomeTitle: 'Bienvenido',
      subtitle: 'Ingresa a tu cuenta para continuar',
      emailLabel: 'Email',
      emailPlaceholder: 'tu@negocio.com',
      passwordLabel: 'Contraseña',
      submitButton: 'Iniciar sesión',
    },
    register: {
      title: 'Registro deshabilitado',
      description: 'Las cuentas de negocio ahora se crean desde el panel de administración. Contacta a soporte para dar de alta tu negocio. Una vez que tengas tu cuenta, tú mismo podrás agregar tiendas y trabajadores desde aquí.',
      goToLogin: 'Ir a iniciar sesión',
    },
  },

  onboarding: {
    skip: 'Omitir',
    start: 'Comenzar',
    next: 'Siguiente',
    slides: {
      slide1: {
        title: 'Nunca te pierdas un yapeo',
        description: 'Recibe alertas instantáneas cada vez que alguien te pague por Yape, Plin o Izipay. Sin delays, sin pérdidas.',
      },
      slide2: {
        title: 'Recibe alertas donde quieras',
        description: 'Notificaciones push o incluso voz. Tú decides cómo y cuándo te avisamos.',
      },
      slide3: {
        title: 'Reportes en tiempo real',
        description: 'Visualiza tus ventas del día, semana o mes. Toma mejores decisiones con datos claros.',
      },
    },
  },

  notifications: {
    header: {
      title: 'Notificaciones',
    },
    markAllRead: 'Marcar leídas',
    sections: {
      today: 'Hoy',
      yesterday: 'Ayer',
      thisWeek: 'Esta semana',
    },
    paidVia: (method: string) => `Pago por ${method}`,
    empty: {
      title: 'Aún no tienes notificaciones',
      description: 'Las notificaciones de tus pagos aparecerán aquí en tiempo real.',
    },
  },
};

export default es;
