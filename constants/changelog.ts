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
