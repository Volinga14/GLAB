# Swing Lab frente a Swing Sensei y DeepSwing

Revisión del 11 de noviembre de 2026. Base propia: GLAB 0.45 / interfaz Android 0.6.

## Conclusión de producto

Swing Sensei sirve como referencia para reducir el esfuerzo entre ver un fallo y practicar una corrección. DeepSwing sirve como referencia del siguiente salto de visión artificial: seguir el cuerpo y el palo, y explicar los resultados sobre el vídeo. Swing Lab ya comparte buena parte del recorrido de revisión; su carencia principal es una capa local de mediciones técnicas evaluada con vídeos independientes.

La prioridad propuesta es mejorar captura, evidencia y continuidad entre revisiones. Una referencia 3D atractiva no sustituye la fiabilidad del marcado ni demuestra que una posición sea correcta para todas las personas.

## Qué se ha probado y qué queda pendiente

| Actividad | Resultado de esta revisión |
|---|---|
| Swing Sensei: web, pantallas oficiales y ficha de tienda | Revisadas. Se inspeccionaron capturas de puntuación, prioridad, ejercicios y progreso. |
| DeepSwing: web y vídeo de demostración | Abierto y visualizado el vídeo oficial; se observó el editor vertical con herramientas flotantes, dibujo, reproducción y navegación por fases. |
| DeepSwing: selector web de fallos | Se intentó seleccionar Fat; la observación posterior seguía mostrando Slice. No se considera una interacción funcional validada. |
| Instalación de las apps nativas | No realizada: el entorno disponible es Linux con navegador, sin Android/iOS conectado. |
| Mismo swing analizado en las tres apps | Pendiente. No hay resultados comparables de precisión, velocidad o consistencia. |
| Swing Lab: código actual | Inspeccionados README, motor de revisión, puntuación, entrenamiento, exportación y caché. |

La web comercial y su vídeo muestran funciones; no constituyen una prueba independiente de funcionamiento. No se compraron suscripciones ni se enviaron vídeos privados a terceros. Las funciones nativas de las tablas siguientes son declaraciones oficiales, salvo las observaciones de demo indicadas arriba.

## Swing Sensei

Su recorrido principal es grabar o importar, recibir una nota sobre diez y trabajar la corrección prioritaria. La documentación actual anuncia once controles y procesamiento local; se centra en la vista desde atrás. Añade ejercicios de un profesional PGA y sesiones de práctica con detección automática y voz entre golpes. [S1, S2]

Lo interesante para nuestro diseño es la jerarquía: una tarea antes de desplegar el resto de controles. Las capturas muestran resultados resumidos y acceso al ejercicio. La práctica recurrente, el historial por control y el resumen semanal mantienen un hilo entre sesiones. Su ficha también anuncia un swing de ejemplo para conocer la experiencia antes de aportar un vídeo propio. [S1, S2]

No hay documentación técnica suficiente en las fuentes revisadas para identificar su red neuronal, entrenamiento, umbrales completos o exactitud independiente. Tampoco puede deducirse que use un LLM porque el producto diga IA. La nota es un índice de su rúbrica, no un handicap ni una escala intercambiable con la nuestra.

En España, la ficha consultada enumera 14,99 €/mes, 89,99 €/año y 199,99 € de por vida, con tres análisis gratuitos mensuales. Los precios y versiones pueden variar por región; no se ha probado la pantalla de compra. [S2]

## DeepSwing

Declara seis fases, controles adaptados a la vista y seguimiento de la cabeza del palo. Atribuye a esa trayectoria controles como plano, over the top, shaft lean y casting; permite corregir marcas y volver a analizar. Su web usa “20+” controles y la ficha española “27”: no hay que convertir esos recuentos comerciales en una comparación de precisión. [D1, D3]

La vista FO se utiliza para desplazamientos laterales y tiempos; DTL para trayectoria proyectada y postura. También declara velocidades estimadas del palo y de la bola a partir del vídeo de frente. Publica la función, pero las fuentes revisadas no aportan una validación independiente con error y condiciones de medida. [D4, D5, D6]

La versión Android anuncia análisis local, captura automática, varios swings, comparación por fases y grabación a 120/240 fps en dispositivos compatibles. No se ha comprobado qué modos admite un Samsung concreto. La web actual separa el coach disponible en Android del launch monitor y GPS completos, anunciados como disponibles en iPhone y pendientes en Android. [D2, D7]

En la demo observada, el vídeo ocupa el centro y las herramientas aparecen en paneles flotantes. Es una referencia útil para conservar espacio del jugador, aunque muchos iconos sin etiqueta pueden dificultar el aprendizaje. La presentación añade trayectoria del palo, esqueleto y ghost 3D; estos elementos explican visualmente diferencias, pero el ghost es una referencia, no evidencia de reconstrucción biomecánica 3D del jugador. [D1, D7]

La actualización 3.3.2 describe ajustes del tracking para evitar saltos hacia objetos del fondo y cambios en el marcado. Esto refuerza una necesidad para nuestro futuro detector: ensayos con oclusión, movimiento rápido y distracciones, además de vídeos limpios. [D3]

## Comparación con el código actual de Swing Lab

| Aspecto | Swing Sensei, declarado | DeepSwing, declarado | Swing Lab, verificado en código |
|---|---|---|---|
| Entrada | Grabar/importar y ejemplo | Grabar/importar y autocaptura | Grabar/importar, editor completo |
| Procesamiento | Análisis local | Análisis central local | Marcado local; revisión opcional con agente |
| Fases | Seis en su ficha actual | Seis, editables | Cinco eventos, editables; impacto manual opcional |
| Análisis técnico | Once controles | Cuerpo y cabeza del palo | Agente sobre imágenes de evidencia; no es seguimiento continuo del cuerpo/palo |
| Puntuación | Sensei Score /10 | Swing Score y desglose | Media de ≥3 áreas con evidencia y confianza media/alta; N/E excluido |
| Consejo principal | Una corrección y ejercicio | Una prioridad y ejercicio | Primera prioridad visible; hasta dos secundarias plegadas |
| Entrenamiento | Vídeos PGA | Vídeos, instrucciones, plan | Seis ejercicios propios, tres vistas ilustrativas, registro y plan del informe |
| Comparación | Shadow por fases en ficha US actual | Comparación sincronizada y ghost | Capturas por fase con ajuste de superposición; no asumir reproducción dual continua |
| Progreso | Tendencia por control | Historial y métricas por palo | Cohortes por vista, palo, rúbrica y áreas evaluadas |
| Campo de prácticas | Detección y voz | Autocaptura y Live Coach | Sin bucle de detección continua equivalente |
| Exportación | Tarjetas compartibles | Vídeo con overlays | Informe HTML, impresión PDF, imágenes anotadas y paquetes de revisión |

Fuentes de competidores: S1–S3, D1–D7. Base propia: `agent-review.js`, `coaching-report.js`, `practice.js`, `practice-ui.js`, `app.js`, `local-engine.js` y README del mismo checkout. Es una comparación de alcance, no una clasificación de calidad.

## Cómo parecen resolver el análisis

Lo publicado permite identificar etapas funcionales: vídeo → localización temporal → controles → puntuación → prioridad → ejercicio. DeepSwing añade explícitamente una trayectoria de la cabeza del palo. La arquitectura interna exacta de ambas apps sigue sin verificarse.

Para Swing Lab recomiendo mantener separadas estas tareas:

1. Captura y control de calidad: encuadre, nitidez y visibilidad, antes de emitir una recomendación.
2. Detección temporal: localizar el swing y sus eventos, preservando correcciones manuales.
3. Tracking y geometría: cuerpo, manos, varilla y cabeza del palo, con continuidad temporal y estados no evaluables.
4. Interpretación: reglas por vista y palo, con procedencia de las referencias y límites claros.
5. Coaching: convertir evidencia en una tarea practicable; el agente puede contextualizar sin inventar mediciones.

Esta es una propuesta propia, no una descripción del código privado de los competidores. Un vídeo monocular no mide directamente presiones de apoyo. Una trayectoria 2D tampoco proporciona por sí sola cara del palo, spin, distancia o velocidad física sin calibración y validación adecuadas.

## Cambios incorporados en esta rama

- El informe explica su cálculo real con suma, número de áreas y media; aclara por qué puede faltar una nota.
- Cada área muestra confianza, inclusión/exclusión en la media y acceso a sus imágenes de evidencia.
- Una guía plegada ayuda a repetir una captura FO o DTL comparable.
- Los apartados se conservan en la exportación HTML y la impresión. La prioridad y su ejercicio siguen apareciendo antes del detalle.
- Caché actualizada para servir los recursos nuevos.

No se ha cambiado la rúbrica ni el motor. Los cambios son del frontend compartido; requieren integrar esta rama y compilar para llegar a un APK nuevo.

## Siguiente orden de implementación

| Orden | Trabajo | Criterio de aceptación |
|---|---|---|
| 1 | Captura guiada y comprobación previa | Avisar de cuerpo/palo recortados; permitir importar y revisar manualmente |
| 2 | Continuar un objetivo entre sesiones | Elegir y mantener un foco explícito sin sustituirlo por cada informe nuevo |
| 3 | Comparación de dos vídeos por eventos | Arranque y navegación coordinados, con opción de ver el tiempo real de cada vídeo |
| 4 | Tracking del palo experimental | Etiquetas independientes y error por fase; abstención cuando no es visible |
| 5 | Modo práctica con captura repetida | No perder golpes ni confundir ensayos; medir latencia, temperatura y batería |
| 6 | Referencia visual 3D ajustable | Perspectiva y lateralidad explícitas; sin presentar desviaciones de silueta como fallos universales |

La oportunidad más fuerte es cerrar el ciclo observar → practicar → grabar → comprobar. GPS, comunidad y simulador amplían mucho el alcance; ahora aportan menos a la fiabilidad del análisis de Swing Lab.

## Protocolo para probar los motores de verdad

Propuesta pendiente, no ejecutada: preparar al menos doce clips autorizados, combinando FO/DTL, diestro/zurdo, hierro/driver, 30/60/120+ fps, tomas correctas y problemas de captura. Guardar hash y metadatos de cada original; repetir una selección tres veces por aplicación. Añadir clips negativos sin swing. Un revisor humano debe marcar eventos con intervalos de incertidumbre y anotar las observaciones visibles antes de ver los informes automáticos.

Comparar error de fases en milisegundos y frames originales, falsos positivos, estabilidad de nota, controles no evaluables, utilidad del primer consejo, posibilidad de corregir errores y tiempo/taps hasta practicar. Registrar versión, móvil, condiciones térmicas, plan gratuito/pago y qué funciones requieren red. Comprobar el modo avión después de preparar modelos. Si se evalúa velocidad, añadir un instrumento de referencia y registrar su incertidumbre.

El benchmark debe distinguir acierto técnico, explicación y UX. No comparar directamente 8/10 en una app con 80/100 en otra, ni considerar más controles una prueba de más exactitud.

## Fuentes oficiales consultadas

- S1: https://theswingsensei.com/
- S2: https://apps.apple.com/es/app/swing-sensei/id6759412468
- S3: https://apps.apple.com/us/app/swing-sensei/id6759412468
- D1: https://deepswing.io/ai-golf-swing-analyzer/
- D2: https://deepswing.io/android-golf-swing-analyzer/
- D3: https://apps.apple.com/es/app/deepswing-an%C3%A1lisis-swing-golf/id6751551257
- D4: https://deepswing.io/down-the-line-golf-swing-analysis/
- D5: https://deepswing.io/face-on-golf-swing-analysis/
- D6: https://deepswing.io/golf-swing-speed-app/
- D7: https://deepswing.io/?lang=en
- D8: https://play.google.com/store/apps/details?id=io.deepswing.android

Las versiones de fichas regionales y páginas pueden no estar sincronizadas. No se han verificado cifras de usuarios, testimonios ni promesas de reducción de handicap, y no se utilizan para concluir eficacia.
