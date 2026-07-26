import es from './es';

const en: typeof es = {
  common: {
    actions: {
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      close: 'Close',
      delete: 'Delete',
      back: 'Back',
      configure: 'Configure',
      connect: 'Connect',
      connected: 'Connected',
    },
    form: {
      name: 'Name',
    },
    roles: {
      owner: 'Owner',
      supervisor: 'Supervisor',
      cajero: 'Cashier',
    },
    fallback: {
      unassigned: 'Not assigned',
      noEmail: 'No email',
    },
    months: {
      abbr: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      full: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    },
    noPaymentsInPeriod: 'No payments in this period',
  },

  settings: {
    languageSection: 'Language',
    languageComingSoon: 'Coming soon',
    section: {
      myBusiness: 'My business',
      battery: 'Battery',
      notifications: 'Notifications',
      integrations: 'Integrations',
      account: 'Account',
      about: 'About',
    },
    myBusiness: {
      owner: 'Owner',
      plan: 'Plan',
      expires: 'Expires',
      defaultStore: 'Default store',
      unassigned: 'Not assigned',
      defaultStoreHint: 'Payments captured by this phone are added to the default store.',
    },
    battery: {
      captureActiveLabel: 'Capture active',
      ignoreOptimization: 'Ignore battery optimization',
      xiaomiAutostart: 'Autostart (Xiaomi)',
      hintActive: 'YapLin checks for new payments every 5 seconds and listens for Yape/Plin/Izipay notifications. Enable "Ignore battery optimization" (and "Autostart" if your phone is a Xiaomi) so Android doesn\'t shut it down after a while.',
      hintPaused: 'Capture paused: payment notifications are not synced or read. Turn it on before you start serving customers.',
    },
    notifications: {
      push: 'Push notifications',
      voiceAlert: 'Voice alert',
    },
    integrations: {
      androidOnly: 'Automatic payment capture is only available on Android.',
      bankCount: (n: number) => `${n} bank${n !== 1 ? 's' : ''}`,
      permissionWarning: 'Connecting will open Android Settings so you can grant YapLin notification access. Return to the app after enabling it.',
    },
    account: {
      logout: 'Log out',
    },
    about: {
      version: 'Version',
      channel: 'Channel',
      update: 'Update',
    },
    plinModal: {
      title: 'Plin by bank',
      description: 'Plin isn\'t its own app: it lives inside your bank\'s app. Turn on the banks you receive Plin payments from.',
      done: 'Done',
    },
    storeModal: {
      title: 'Default store',
      description: 'This phone can only have one Yape/Plin/Izipay account connected. Every captured payment is added to the store you choose here.',
    },
  },

  dashboard: {
    greeting: 'Good morning',
    weekAbbr: 'Week',
    periods: {
      today: 'Today',
      day: 'Day',
      week: 'Week',
      month: 'Month',
    },
    totalReceived: 'Total received',
    recentPayments: 'Recent payments',
    periodPayments: 'Payments for this period',
    viewAll: 'View all',
    transactionsCount: (n: number) => `${n} transaction${n !== 1 ? 's' : ''}`,
    allPayments: 'All payments',
    periodTotal: 'Period total',
    paymentsCount: (n: number) => `${n} payment${n !== 1 ? 's' : ''}`,
    transactionsLabel: 'Transactions',
    resultsCount: (n: number) => `${n} results`,
    picker: {
      selectDay: 'Select a day',
      selectWeek: 'Select a week',
      selectMonth: 'Select a month',
      viewDay: (day: number, month: string, year: number) => `View ${month} ${day}, ${year}`,
      weekN: (n: number) => `Week ${n}`,
    },
  },

  team: {
    header: {
      title: 'My team',
      subtitle: (active: number, total: number) => `${active} active · ${total} total`,
    },
    roles: {
      ownerDesc: 'Full access to all stores and settings',
      supervisorDesc: 'View and manage payments for their assigned store',
      cajeroDesc: 'Only receives payment notifications for their store',
    },
    permissions: {
      viewAllStores: 'View all stores',
      addEditMembers: 'Add/edit members',
      reconciliationReports: 'Reconciliation and reports',
      accountSettings: 'Account settings',
      receiveNotifications: 'Receive notifications',
    },
    inactiveLabel: 'Inactive',
    accessLevelsTitle: 'Access levels',
    matrix: {
      permission: 'Permission',
      supervisorAbbr: 'Sup.',
    },
    membersTitle: 'Members',
    allStores: 'All stores',
    storeAssignedLabel: 'Assigned store',
    deleteAlert: {
      title: 'Delete member',
      message: (name: string) => `Delete "${name}" from the team?`,
    },
    memberDetailTitle: 'Member detail',
    activeMemberLabel: 'Active member',
    permissionsTitle: 'Permissions',
    addMemberTitle: 'Add member',
    editMemberTitle: 'Edit member',
    form: {
      namePlaceholder: 'Ana Torres',
      emailLabel: 'Email',
      emailPlaceholder: 'ana@business.com',
      passwordLabelEdit: 'New password (leave blank to keep it unchanged)',
      passwordLabelNew: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      roleSectionTitle: 'Role',
      saveError: 'Could not save. Please try again.',
    },
  },

  stores: {
    header: {
      title: 'My stores',
      subtitle: (active: number, total: number) => `${active} active · ${total} total`,
    },
    noAddress: 'No address',
    noAccount: 'No account',
    status: {
      active: 'Active',
      inactive: 'Inactive',
    },
    stats: {
      today: 'Today',
      thisMonth: 'This month',
      payments: 'Payments',
    },
    summary: {
      totalToday: 'Total consolidated today',
      thisMonthAmount: (amount: string) => `${amount} this month`,
      activeStores: 'Active stores',
      paymentsToday: 'Payments today',
      team: 'Team',
    },
    sectionTitle: 'Stores',
    revenueLabel: 'Revenue',
    notificationAccountLabel: 'Notification account',
    assignedTeamLabel: 'Assigned team',
    paymentMethodsLabel: 'Payment methods',
    addStoreTitle: 'Add store',
    editStoreTitle: 'Edit store',
    deleteAlert: {
      cannotDeleteTitle: 'Cannot delete',
      cannotDeleteMessage: 'There must be at least one store.',
      title: 'Delete store',
      message: (name: string) => `Delete "${name}"? This action cannot be undone.`,
    },
    form: {
      namePlaceholder: 'Main Store',
      addressLabel: 'Address',
      addressPlaceholder: '123 Main St',
      accountPlaceholder: 'store@business.com',
    },
  },

  transaction: {
    notFound: 'This transaction is no longer available.',
    confirmed: 'Confirmed',
    via: (label: string) => `via ${label}`,
    detailTitle: 'Payment detail',
    detail: {
      date: 'Date',
      time: 'Time',
      reference: 'Reference',
      method: 'Payment method',
      status: 'Status',
    },
    payerSummaryTitle: 'Customer summary',
    payerSummary: (count: number, totalAmount: string) => `${count} payments · ${totalAmount} total`,
    historyTitle: 'Payment history',
    viewMore: 'View more',
    shareReceipt: 'Share receipt',
    reportProblem: 'Report a problem',
    shareMessage: (payerName: string, amount: string, method: string, reference: string, date: string, time: string) =>
      `YapLin receipt\n${payerName} paid ${amount} via ${method}\nRef: ${reference}\nDate: ${date} ${time}`,
    reportEmail: {
      subject: (reference: string) => `Problem report - Payment ${reference}`,
      businessLine: (businessName: string, storeName: string) => `Business: ${businessName} — Store: ${storeName}`,
      methodLine: (method: string) => `Payment method: ${method}`,
      amountLine: (amount: string) => `Amount: ${amount}`,
      dateLine: (date: string, time: string) => `Date and time: ${date} ${time}`,
      referenceLine: (reference: string) => `Reference: ${reference}`,
      reportedByLine: (name: string, email: string) => `Reported by: ${name} (${email})`,
      descriptionLabel: 'Problem description:',
      descriptionPlaceholder: '(write the details here)',
    },
    accumulatedAmount: 'Accumulated amount',
    paymentsCount: (n: number) => `${n} payment${n !== 1 ? 's' : ''}`,
    percentOfTotal: (pct: number) => `${pct}% of total`,
    filterAll: 'All',
    noMailApp: {
      title: 'We couldn\'t find a mail app',
      description: 'Email support directly with the details of this payment:',
    },
  },

  auth: {
    login: {
      missingFields: 'Enter your email and password',
      connectionError: 'Could not connect to the server',
      tagline: 'Real-time payment notifications',
      welcomeTitle: 'Welcome',
      subtitle: 'Sign in to your account to continue',
      emailLabel: 'Email',
      emailPlaceholder: 'you@business.com',
      passwordLabel: 'Password',
      submitButton: 'Sign in',
    },
    register: {
      title: 'Registration disabled',
      description: 'Business accounts are now created from the admin panel. Contact support to set up your business. Once you have your account, you\'ll be able to add stores and workers yourself from here.',
      goToLogin: 'Go to sign in',
    },
  },

  onboarding: {
    skip: 'Skip',
    start: 'Get started',
    next: 'Next',
    slides: {
      slide1: {
        title: 'Never miss a payment',
        description: 'Get instant alerts every time someone pays you via Yape, Plin, or Izipay. No delays, no missed payments.',
      },
      slide2: {
        title: 'Get alerts however you want',
        description: 'Push notifications or even voice. You decide how and when we notify you.',
      },
      slide3: {
        title: 'Real-time reports',
        description: 'View your sales for the day, week, or month. Make better decisions with clear data.',
      },
    },
  },

  notifications: {
    header: {
      title: 'Notifications',
    },
    markAllRead: 'Mark as read',
    sections: {
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This week',
    },
    paidVia: (method: string) => `Payment via ${method}`,
    empty: {
      title: 'You don\'t have any notifications yet',
      description: 'Notifications for your payments will show up here in real time.',
    },
  },
};

export default en;
