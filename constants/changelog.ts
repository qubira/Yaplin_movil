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
