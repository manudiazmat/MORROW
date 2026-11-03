<p><img src="assets/brand/wordmark.svg" alt="morrow" width="220"></p>

_Your life. Your time. Your tomorrow._ — gestor personal para iOS y Android (Expo SDK 58, React Native 0.88, TypeScript, Expo Router).

## Arrancar

```bash
npm install
npx expo start          # escanea el QR con Expo Go o abre un simulador
npm run typecheck       # TypeScript
npx expo lint           # ESLint (incluye reglas de React Compiler)
npm test                # pruebas de dominio (finanzas, recurrencias, Life Balance)
```

La app funciona entera sin servicios externos: los datos viven en el dispositivo (AsyncStorage) y persisten entre sesiones.

## Arquitectura

| Capa        | Dónde                                                   | Decisión                                                                                                                                                            |
| ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rutas       | `src/app`                                               | Expo Router: 5 pestañas (Inicio, Plan, Salud, Finanzas, Objetivos; Perfil desde Inicio), editores modales `/edit/<tipo>`, Life Balance, revisión semanal, asistente |
| Estado      | `src/store`                                             | Zustand persistido, **local-first**. Cada escritura entra en una _outbox_ para sincronizar                                                                          |
| Dominio     | `src/lib/domain`                                        | Cálculos puros y probados: finanzas (céntimos enteros), objetivos, Life Balance, insights, revisión                                                                 |
| Diseño      | `src/theme`                                             | Tokens claro/oscuro diseñados por separado, 8 colores de acento con contraste comprobado (`ACCENTS`), sistema de movimiento (`motion.ts`)                           |
| Componentes | `src/components`                                        | Primitivas neumórficas, flor Life Balance (SVG + Reanimated), gráficos, sheet                                                                                       |
| Sync        | `src/lib/sync.ts`                                       | Push de la outbox por `id` (UUID del dispositivo, sin duplicados) + pull incremental por `server_updated_at`; conflictos: última escritura gana                     |
| IA          | `src/lib/assistant.ts` + `supabase/functions/assistant` | Independiente del proveedor; las claves solo en el servidor; las acciones vuelven como **propuestas** que confirma la persona                                       |

## Salud: deporte y dieta

- **Rutinas** con ejercicios (series, repeticiones, peso, descanso). Opcionalmente crean eventos semanales en la agenda.
- **Sesión de entreno**: marcas series, se lanza el descanso, guardas el esfuerzo. Cuenta para Life Balance sin duplicar el evento del mismo día.
- **Dietas** por día y comida, con recetas enlazadas o texto libre, comidas marcadas como hechas e **imágenes** (galería o cámara).
- **Recetas** con foto, ingredientes que se escalan por raciones, pasos y valores nutricionales opcionales.
- Las imágenes se guardan en el dispositivo (en web, comprimidas en el navegador). Sincronizarlas necesitará Supabase Storage.

## Recompensas

- Eliges algo que quieres comprarte (nombre, precio, foto y enlace opcionales). Vive en **Objetivos → Recompensas** y en una tarjeta de Inicio.
- Lo que haces genera **crédito** que se resta de su precio: tareas diarias (hábitos con valor), tareas del Plan, entrenos, comidas de la dieta, revisión semanal y un extra por completar todas las del día. Cada valor se ajusta en _Tareas y valores_.
- Catálogo de tareas básicas del día a día (casa, salud, mente, trabajo, dinero, personas) para añadir con un toque.
- Si hay varias recompensas, el crédito llena la primera de la cola antes de pasar a la siguiente. Al llegar a cero se **canjea**, y opcionalmente se apunta la compra como gasto en Finanzas.
- Funciona como un libro de movimientos (`reward_entries`) que se concilia con lo hecho: solo cuenta desde la primera recompensa, desmarcar algo resta, y cambiar un valor no altera lo ya ganado. Lógica en `src/lib/domain/rewards.ts`, con pruebas.
- El crédito no es dinero real.

## Configurar Supabase

1. Crea un proyecto en supabase.com y copia `.env.example` a `.env` con la URL y la _anon key_.
2. Aplica el esquema (tablas, índices, triggers y Row Level Security):
   ```bash
   npx supabase link --project-ref <tu-ref>
   npx supabase db push            # aplica las migraciones de supabase/migrations
   ```
3. Despliega las funciones:
   ```bash
   npx supabase functions deploy assistant
   npx supabase functions deploy delete-account
   ```

## Configurar el asistente

```bash
npx supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=<tu clave> AI_MODEL=claude-sonnet-5-5
# o bien: AI_PROVIDER=openai AI_API_KEY=<tu clave> AI_MODEL=<modelo>
```

Después pon `EXPO_PUBLIC_ASSISTANT_ENABLED=true` y `EXPO_PUBLIC_ASSISTANT_PROVIDER_NAME=Anthropic` en `.env` y reinicia Expo. El asistente exige sesión iniciada y consentimiento explícito; solo envía los módulos permitidos en Perfil.

## Demo web en un solo archivo

```bash
npm run demo        # genera web-demo/morrow-demo.html (app + fuentes + datos de ejemplo)
```

Ábrelo con cualquier servidor estático. Arranca con datos de ejemplo claramente marcados y un botón _Empezar de cero_. La demo es solo para probar: en la app real no hay datos de ejemplo.

## Subir a GitHub

```bash
git remote add origin git@github.com:<tu-usuario>/morrow.git
git push -u origin main
```

El flujo `.github/workflows/ci.yml` comprueba tipos, lint, pruebas y la build web en cada push y pull request.

## Marca

| Pieza                              | Archivo                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Logotipo (vector)                  | `assets/brand/wordmark.svg` · en la app: `Wordmark` (`src/components/Logo.tsx`) |
| Símbolo «m» (vector)               | `assets/brand/symbol.svg` · en la app: `Mark` (`src/components/Icon.tsx`)       |
| Icono iOS (claro, oscuro, tintado) | `assets/icon.png`, `assets/icon-ios-dark.png`, `assets/icon-ios-tinted.png`     |
| Icono adaptativo Android           | `assets/android-icon-{foreground,background,monochrome}.png`                    |
| Pantalla de carga (clara y oscura) | `assets/splash-icon.png`, `assets/splash-icon-dark.png`                         |

Los vectores salen del arte original; en la app el logo y el símbolo usan siempre el color de texto del tema (nunca el acento).

## Builds nativas

Expo Go cubre todo lo usado. Para publicar: `npx eas-cli@latest build -p ios|android`.
