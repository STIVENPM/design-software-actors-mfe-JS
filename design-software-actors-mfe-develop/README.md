# actors-mfe

Microfrontend local para administrar el perfil base de instructores, sus áreas de conocimiento y contratos.

## Desarrollo

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Al copiar `.env.example`, la aplicación inicia en **modo demostración** con datos locales en memoria. Así se puede recorrer el flujo completo de QA sin backend: altas, edición, baja lógica, filtros, áreas y contratos funcionan mientras la app permanece cargada. Al recargar, vuelve al dataset inicial. La interfaz lo identifica con el badge “Modo demostración”; no persiste datos ni simula autorización RBAC real.

Para conectar el backend, configura `VITE_ACTORS_API_MODE=http` y `VITE_ACTORS_API_BASE_URL` con la URL base del servicio (por defecto `/api/v1`, relativa al mismo host). Los errores de conexión se muestran explícitamente; no hay fallback automático a datos falsos.

### Endpoints ya expuestos por el cliente HTTP

Al activar el modo API, el cliente está listo para enviar estas solicitudes:

| Operación | Método y ruta |
| --- | --- |
| Listar instructores | `GET /instructors?status={active\|inactive}` (`status` se omite para todos) |
| Crear instructor | `POST /instructors` |
| Consultar perfil | `GET /instructors/{id}` |
| Editar perfil | `PUT /instructors/{id}` |
| Baja lógica | `DELETE /instructors/{id}` |
| Listar áreas | `GET /instructors/{id}/areas` |
| Asociar área | `POST /instructors/{id}/areas` |
| Listar contratos | `GET /instructors/{id}/contracts` |
| Crear contrato | `POST /instructors/{id}/contracts` |

Cerrar contrato está implementado como `PATCH /instructors/{id}/contracts/{contractId}` con `{ "is_current": false }`, pero esa operación queda pendiente de confirmación del contrato backend. Los métodos/cuerpos y el parámetro de estado también deben contrastarse con `actors.yaml` antes de integrar. El cliente envía y propaga los errores HTTP; nunca cambia silenciosamente de API real a datos demo.

## Mi disponibilidad (HU-ACT-016)

La ruta `/instructor/mi-disponibilidad` obtiene `actor_id` de `AuthClient.currentUser()` y solo se abre si `actor_type` y un rol son `INSTRUCTOR` y `actor_id` es un UUID. Este `actor_id` se usa como `instructorId` en las solicitudes de excepciones; no hay selector ni parámetro editable. El contrato IAM versionado proviene de `design-software-docs/07-api/contracts/openapi/iam.yaml` en `38bf3e9`.

### Recorrido de QA sin IAM

```powershell
Copy-Item .env.example .env
npm.cmd run dev
```

Abre `http://localhost:5173/instructor/mi-disponibilidad`. Con `VITE_ACTORS_API_MODE=mock`, la pantalla muestra **Modo demostración** y usa una sesión ficticia de Juan Pérez, con rol `INSTRUCTOR` y `actor_id` asociado al primer instructor del mock. No hace una solicitud a IAM. En **Nueva excepción**, elige el motivo, ingresa inicio y fin, agrega una descripción opcional y pulsa **Registrar excepción**; la respuesta se agrega a **Mis excepciones**. Al recargar la página, el módulo mock se inicializa de nuevo y las excepciones creadas desaparecen. No hace falta editar código fuente.

Con `VITE_ACTORS_API_MODE=http`, la sesión demo se desactiva: `GET /auth/me` debe responder con una sesión real. Un 401, 403 o 404 se muestra como error, sin cambiar a datos ficticios. El host debe proporcionar la autenticación Bearer requerida por IAM y actors-service; este repositorio todavía no incluye el adaptador de sesión del shell. La sesión demo sirve para inspección visual, no para validar RBAC ni integración real.

La pantalla lista las excepciones y registra una con la respuesta 201 del servicio. El formulario envía `exception_type`, `start_datetime`, `end_datetime` y `description` opcional según OpenAPI. Los tipos de IAM y actores se generan desde los contratos versionados con `npm run generate:types`.

**E3 — cancelación en pantalla:** la regla confirmada para el frontend considera futura una excepción cuando `start_datetime` es estrictamente posterior al instante actual. La comparación usa el instante representado por el `date-time` de OpenAPI, con `Z` u offset explícito del dato; un valor sin zona o inválido no habilita la acción. En el instante exacto de inicio deja de ser futura. La pantalla actualiza la elegibilidad mientras permanece abierta. Antes de enviar DELETE se pide confirmación; durante la solicitud se muestra el progreso y, tras la respuesta, el resultado o un error con opción de reintento cuando procede. Esto puede recorrerse en modo mock sin backend.

Para integración real, el `deleteException` disponible en actors-service (`c196358`) borra lógicamente sin comprobar si el inicio es futuro. Backend/Product/QA aún deben acordar la validación del servidor, el código y cuerpo de rechazo para excepciones vigentes o pasadas, y el permiso y alcance de autoservicio `OWN_PROFILE`. El controlador actual exige `ACT_INSTRUCTOR_MANAGE` para POST/DELETE, aunque esta ruta MFE se protege únicamente por rol `INSTRUCTOR`; una respuesta 403 se muestra al usuario. La HU no queda aprobada por estas pruebas locales.

## Aprendices e inscripción en ficha (HU-ACT-017)

La ruta `/aprendices`, enlazada desde la navegación de Instructores, lista perfiles paginados, permite crear y editar aprendices, abre el perfil con `GET /learners/{id}` y consulta su historial con `GET /learners/{id}/ficha-enrollments`. **Estado y fecha de inscripción solo se leen del subrecurso**; no se agregan al tipo `Learner` ni al formulario del perfil. La cancelación de la inscripción vigente usa `DELETE /learners/{id}` con confirmación. El servicio conserva el perfil y el historial y cambia el estado de la inscripción vigente a `CANCELLED`; incluso mantiene `is_current=true`, por lo que el shell debe pasar `cancelledEnrollmentStatusId` para ocultar la acción tras volver a cargar el detalle en modo HTTP.

La copia versionada de `contracts/openapi/actors.yaml` se contrastó con `LearnerController`, `LearnerDto`, `LearnerPageEnvelope`, `LearnerFichaEnrollmentResponse`, `LearnerFichaEnrollmentCreateRequest` y `LearnerControllerIT` de actors-service. Se corrigieron estas diferencias comprobadas: el listado usa `page` y `limit` y devuelve `pagination.total_items/current_page/total_pages`; `LearnerDto` no devuelve `full_name`; la respuesta de inscripción no devuelve `created_at`; el POST de inscripción **requiere** `enrollment_status_id`. Los tipos de `src/generated/actors.ts` se regeneran con `npm.cmd run generate:types`. La respuesta real sigue representando estado de inscripción mediante UUID de catálogo, no mediante un texto o enum dentro de `Learner`.

El shell integra `LearnersPage` mediante estas props:

| Prop | Uso |
| --- | --- |
| `UserSelector` | Componente React con `value`, `onChange` y `disabled`; el shell busca o selecciona un usuario IAM y entrega `{ id, label }`. En HTTP, sin este selector, el alta de aprendiz permanece deshabilitada. |
| `FichaSelector` | Componente React con `value`, `onChange` y `disabled`; obtiene fichas mediante academic-management-mfe y entrega `{ id, label }`. actors-mfe no llama `GET /fichas`. |
| `EnrollmentStatusSelector` | Componente equivalente que entrega el UUID de un estado de inscripción válido del catálogo de actores; el backend lo exige en POST. |
| `fichaLabels`, `enrollmentStatusLabels` | Mapas opcionales de UUID a etiqueta para mostrar nombres de inscripciones ya guardadas. Sin ellos se muestran los UUID recibidos. |
| `cancelledEnrollmentStatusId` | UUID del estado `CANCELLED` del catálogo de inscripción; evita volver a ofrecer la baja lógica tras cargar el historial. |
| `canManageLearners` | Permiso calculado por el shell desde `ACT_LEARNER_MANAGE`; sin él, en modo HTTP la pantalla es de solo lectura. El servidor sigue validando `ACT_LEARNER_VIEW` y `ACT_LEARNER_MANAGE`. |

En modo HTTP, si faltan los selectores de ficha y estado, el formulario de inscripción muestra la dependencia y no envía POST; si falta `UserSelector`, el alta de aprendiz queda deshabilitada. En modo mock hay selectores locales de ficha y estado, y se genera automáticamente un UUID de usuario ficticio al abrir el alta. El coordinador no tiene que escribir UUID. Este modo no valida permisos reales ni persistencia.

El repositorio usa estilos globales en `src/ui/styles.css`; no existe una infraestructura de CSS Modules. HU-ACT-017 siguió la convención presente en lugar de introducir otro sistema de estilos solo para esta pantalla.

## Competencias del instructor (HU-ACT-015)

La pestaña **Competencias** del detalle de instructor consulta `GET /instructors/{id}/competencies`, agrega la respuesta de `POST` (201) y revoca con `DELETE /instructors/{id}/competencies/{competency_assignment_id}` (204). El error 409 del POST se muestra junto al selector. Solo aparecen las asignaciones activas. La interfaz no expone `requires_review`.

Los tipos de esta funcionalidad se generan desde la copia versionada de `contracts/openapi/actors.yaml` y `contracts/openapi/_shared.yaml`, tomada de `design-software-docs/07-api/contracts/openapi/` en el commit `38bf3e9`. Tras sincronizar ambos archivos con la fuente aprobada, ejecuta:

```powershell
npm run generate:types
```

El shell monta `<App CompetencySelector={...} canManageCompetencies={...} />`. `CompetencySelector` es un componente React que recibe `value: { id: string; label: string } | null`, `onChange(selection)` y `disabled?`; obtiene sus opciones mediante `academic-management-mfe` y entrega el UUID seleccionado. El shell calcula `canManageCompetencies` a partir de `ACT_INSTRUCTOR_MANAGE`. Sin ese permiso, la pestaña es de solo lectura. Sin el selector inyectado, no se presenta el formulario de asignación. El servicio valida los permisos y el alcance en todas las operaciones.

El contrato de actores devuelve `competency_id`, pero no el nombre de la competencia. Las asignaciones cargadas muestran ese UUID; una asignación recién creada muestra la etiqueta recibida del selector mientras la pestaña permanece abierta. La resolución persistente de nombres queda a cargo de una composición posterior del shell o de un read-model aprobado.

## Contrato de API pendiente de confirmar para las funcionalidades anteriores

Los tipos de [Instructor](./src/domain/instructor.ts) y las rutas anteriores de [actors-api](./src/infrastructure/actors-api.ts) son provisionales y describen el mínimo usado por esta interfaz. A diferencia de ellos, Competencias usa los tipos generados del contrato OpenAPI incluido. Antes de conectar las funciones anteriores al servicio:

- Confirmar `actors.yaml`, la estructura de estado/soft delete y la representación de `full_name`.
- Confirmar el formato de los filtros de estado y la envoltura de las respuestas.
- Confirmar el método/ruta y cuerpo para cerrar un contrato vigente (`PATCH /instructors/{id}/contracts/{contractId}` se dejó como hipótesis explícita).
- Generar los tipos desde el contrato corregido, verificando la observación de auditoría sobre `status_id` y el objeto de catálogo.

La lista y el filtro activo/inactivo se solicitan al backend. El MFE no filtra por scope: el servidor aplica `GLOBAL`, `OWN_PROFILE` o `TRAINING_CENTER` a la identidad autenticada. El buscador solo reduce la lista ya recibida y no altera el alcance autorizado.

Este comportamiento aplica al modo API (`VITE_ACTORS_API_MODE=http`). El modo demostración usa datos ficticios locales y no sirve para validar RBAC ni integración.

Las dependencias de desarrollo usan Vite 6.4.4 y Vitest 4.1.11; el lockfile quedó sin vulnerabilidades conocidas al momento de validarlo.

El archivo `public/assets/sena-logo.svg` usa el logosímbolo oficial SENA 2022 alojado en Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Logosimbolo_SENA_2022.svg

## Validación

```powershell
npm test
npm run build
```
