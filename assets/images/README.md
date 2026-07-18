# assets/images/

Carpeta para imágenes del proyecto.

## Subcarpetas

- **brands/** — Logos de Yape, Plin, Izipay (PNG transparente, 200x200px)
- **onboarding/** — Ilustraciones de las pantallas de onboarding (PNG, 800x600px)
- **misc/** — Imágenes generales (íconos, fondos, etc.)

## Uso en código

```tsx
import { Image } from 'react-native';

// Imagen local
<Image source={require('../../assets/images/brands/yape-logo.png')} style={{ width: 40, height: 40 }} />
```
