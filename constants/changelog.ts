// Manually maintained release notes shown in Settings → Acerca de → Historial
// de actualizaciones. Since updates ship as OTA JS bundles (not App/Play
// Store releases), this is the only place users can see "what changed" —
// add a new entry here whenever a batch of changes is published.
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { es: string; en: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.9',
    date: '4 ago 2026',
    changes: [
      {
        es: 'Al intentar registrar un colaborador con un correo ya usado, ahora se avisa si esa cuenta está activa o solo desactivada (recuerda: desactivar no libera el correo, hay que eliminar la cuenta) — con un ícono de info para más detalle.',
        en: 'Trying to register a team member with an email already in use now shows whether that account is active or just deactivated (deactivating doesn’t free up the email — it has to be deleted) — with an info icon for more detail.',
      },
    ],
  },
  {
    version: '1.8',
    date: '4 ago 2026',
    changes: [
      {
        es: 'Ya no se puede crear ni editar una tienda con el mismo nombre o la misma dirección que otra tienda del negocio — evita confusiones al registrar pagos.',
        en: 'You can no longer create or edit a store with the same name or address as another store in your business — prevents confusion when logging payments.',
      },
    ],
  },
  {
    version: '1.7',
    date: '4 ago 2026',
    changes: [
      {
        es: 'Un supervisor ya no puede activar/desactivar la alerta de sonido (ni editar ningún otro dato) de un cajero de una tienda que no es la suya — solo de los cajeros de su propia tienda.',
        en: 'A supervisor can no longer toggle the sound alert (or edit any other field) of a cashier from a store that isn’t theirs — only cashiers at their own store.',
      },
    ],
  },
  {
    version: '1.6',
    date: '1 ago 2026',
    changes: [
      {
        es: 'El Historial de actualizaciones ahora es una pantalla completa (con botón de regresar) en vez de una hoja pequeña, para que sea más fácil desplazarse por la lista.',
        en: 'Update History is now a full screen (with a back button) instead of a small sheet, making the list much easier to scroll through.',
      },
    ],
  },
  {
    version: '1.5',
    date: '1 ago 2026',
    changes: [
      {
        es: 'Rediseño de navegación: el Dashboard ahora muestra pagos asignados y sin asignar juntos, con un filtro por tienda (incluyendo "Monto sin asignar") desde donde el dueño puede asignarlos directamente.',
        en: 'Navigation redesign: the Dashboard now shows assigned and unassigned payments together, with a store filter (including "Unassigned amount") the owner can assign payments from directly.',
      },
      {
        es: '"Pagos sin asignar" ahora solo la ven supervisores y cajeros; el dueño usa el Dashboard en su lugar.',
        en: '"Pagos sin asignar" (Unassigned Payments) is now only visible to supervisors and cashiers; the owner uses the Dashboard instead.',
      },
      {
        es: 'Supervisores y cajeros ya no ven el Dashboard — su pantalla principal ahora es "Pagos sin asignar".',
        en: 'Supervisors and cashiers no longer see the Dashboard — their main screen is now "Pagos sin asignar" (Unassigned Payments).',
      },
      {
        es: 'Se corrigió que un pago apareciera brevemente duplicado en el conteo justo al registrarse (subía y luego regresaba al número correcto) — ahora el Dashboard y Pagos sin asignar siempre leen la misma información.',
        en: 'Fixed a payment briefly inflating the count right when it was captured (count would jump up then settle back down) — Dashboard and Pagos sin asignar now always read from the same data.',
      },
    ],
  },
  {
    version: '1.4',
    date: '1 ago 2026',
    changes: [
      {
        es: 'Se corrigió un error grave: un pago sin asignar podía duplicarse cada 20 segundos mientras su notificación seguía visible en el celular. Ya se limpiaron los duplicados que se habían creado.',
        en: 'Fixed a serious bug: an unassigned payment could get duplicated every 20 seconds while its notification stayed visible on the phone. The duplicates already created have been cleaned up.',
      },
    ],
  },
  {
    version: '1.3',
    date: '1 ago 2026',
    changes: [
      {
        es: 'Se corrigió que un pago apareciera duplicado (y contado dos veces en el total) en el Dashboard de "Hoy" justo cuando se asignaba a una tienda.',
        en: 'Fixed a payment appearing duplicated (and counted twice in the total) on the "Today" Dashboard right when it was assigned to a store.',
      },
    ],
  },
  {
    version: '1.2',
    date: '1 ago 2026',
    changes: [
      {
        es: 'Se corrigió que la lista del Historial de actualizaciones no se dejaba desplazar bien hacia arriba/abajo.',
        en: 'Fixed the Update History list not scrolling up/down properly.',
      },
    ],
  },
  {
    version: '1.1',
    date: '1 ago 2026',
    changes: [
      {
        es: 'Se corrigió un espacio que quedaba entre algunas hojas (corregir monto, registro manual, crear/editar tienda, crear/editar trabajador) y el borde inferior de la pantalla.',
        en: 'Fixed a gap that was left between some sheets (correct amount, manual entry, create/edit store, create/edit team member) and the bottom edge of the screen.',
      },
      {
        es: 'Se arregló el botón "Editar" en tienda/miembro del equipo, que a veces parecía regresar a la pantalla anterior en vez de abrir la edición.',
        en: 'Fixed the "Edit" button on store/team member, which sometimes appeared to go back instead of opening the edit sheet.',
      },
      {
        es: 'Los pagos sin asignar ahora también se ven en el Dashboard de "Hoy", además de en Pagos sin asignar.',
        en: 'Unassigned payments now also show up on the "Today" Dashboard, in addition to Unassigned Payments.',
      },
      {
        es: 'Nuevo: el dueño (y el supervisor, para sus cajeros) puede elegir por cada miembro del equipo si recibe alerta de sonido. La sección Integraciones de Yape/Plin/Izipay ahora es solo para el dueño.',
        en: 'New: the owner (and supervisor, for their cashiers) can choose per team member whether they receive a sound alert. The Yape/Plin/Izipay Integrations section is now owner-only.',
      },
      {
        es: 'Se corrigió el selector de tienda al crear un colaborador, que no guardaba la tienda elegida.',
        en: 'Fixed the store picker when creating a team member, which wasn’t saving the chosen store.',
      },
      {
        es: 'Se reforzó la alerta de voz para que, si llegara a fallar, nunca impida que el pago se registre.',
        en: 'Hardened the voice alert so that, if it ever fails, it can never prevent the payment itself from being recorded.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '31 jul 2026',
    changes: [
      {
        es: 'Se rediseñaron los formularios y selectores que se abren desde abajo (tiendas, equipo, pagos, PIN, bancos Plin, idioma) para que ya no se vea la pantalla de fondo por debajo.',
        en: 'Redesigned the bottom-sheet forms and pickers (stores, team, payments, PIN, Plin banks, language) so the screen behind no longer shows through underneath.',
      },
      {
        es: 'El teclado ya no tapa la casilla donde se está escribiendo, y ya no queda un espacio en blanco al cerrarlo.',
        en: 'The keyboard no longer covers the field you’re typing in, and no longer leaves a gap behind when it closes.',
      },
      {
        es: 'El selector de tienda ahora tiene buscador, útil cuando hay muchas tiendas.',
        en: 'The store picker now has a search field, useful when there are many stores.',
      },
    ],
  },
];
