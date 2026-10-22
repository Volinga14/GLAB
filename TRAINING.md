# Mejora local del marcado

El motor que usa la app es `Local Mark v0.2`. Conserva los pesos ONNX congelados de GLAB; esta versión integra el motor, mejora el manejo de tiempos y añade feedback trazable. **No se ha entrenado una red nueva ni demostrado todavía una mejora de precisión.** La app principal ofrece un único motor automático local. El laboratorio mantiene GLAB como herramienta de comparación separada.

## Lo que se guarda al revisar

1. Cada ejecución conserva su propuesta, identificador, hashes del checkpoint y de los ONNX, protocolo, muestreo, instantes y huella del vídeo. Volver a analizar no borra ejecuciones anteriores ni sustituye marcas existentes.
2. Cambiar una fase registra propuesta original, marca anterior, nueva marca, fecha y revisor. Las ediciones posteriores conservan el historial; la última corrección del mismo motor/fase sustituye a las anteriores para la captura de contexto pendiente.
3. Al guardar se capturan imágenes alrededor **de ambos centros**, el propuesto y el corregido. Para MP4/MOV clásicos compatibles se usan los tiempos de presentación de las muestras del archivo, incluidos los vídeos con duración variable por fotograma. Cada ventana incluye hasta seis fotogramas anteriores y seis posteriores. Las ventanas se recortan en los bordes y se comparten sus imágenes solapadas.
4. En contenedores o ediciones no compatibles se guarda una ventana temporal de ±0,2 segundos, identificada como tal. No se inventa un FPS ni un número de fotograma. La navegación usa pasos de 20 ms cuando no se dispone de una tabla válida.
5. Las imágenes JPEG de contexto tienen un lado máximo de 640 píxeles. Son vistas de revisión; cada una distingue el instante solicitado de la confirmación del decodificador, cuando está disponible. Para entrenamiento global se vuelve a extraer del original.
6. El vídeo completo sigue siendo parte de la sesión guardada para reproducirla sin conexión. No se crea otra copia completa por corrección. El paquete de aprendizaje exporta por defecto metadatos e imágenes; incluir originales es una opción explícita. Nada se envía ni entrena automáticamente.

Las imágenes y la sesión se guardan en una sola transacción. Un fallo de almacenamiento conserva la sesión anterior. Si la captura de contexto no termina en 30 segundos, se conserva la revisión con el motivo y el original disponible. Eliminar una sesión elimina sus imágenes de feedback y su vídeo.

## Confirmar y exportar

En la revisión, comprobar las cinco definiciones y pulsar **Confirm these five phases**. Solo las etiquetas confirmadas y todavía coincidentes con las marcas actuales son candidatas para entrenamiento. Cambiar una marca invalida la confirmación. Una corrección no se considera automáticamente una etiqueta correcta. **No swing in this video** conserva las propuestas fallidas, elimina las marcas actuales y registra una etiqueta negativa explícita; el exportador la distingue de la supervisión de fases. El importador puede preparar esos originales para un futuro detector de validez, sin convertirlos en fases inventadas.

**Export this review for learning** descarga un ZIP local de esa sesión. En Profile → Data & storage se pueden exportar todas las revisiones guardadas. Para entrenar la secuencia completa, incluir el vídeo original o proporcionar su carpeta al importador:

```sh
python tools/import-learning-pack.py --pack aprendizaje.zip --out CARPETA_PRIVADA_NUEVA --video-dir CARPETA_DE_VIDEOS
```

El importador comprueba el protocolo, los archivos, las confirmaciones y las huellas. Produce `training-index.json`, con los cinco eventos y la correspondencia a los ocho eventos de GLAB; los tres eventos sin etiqueta permanecen ausentes. Excluye del entrenamiento global las revisiones sin original y los conflictos de etiquetas para un mismo vídeo. No modifica GLAB ni entrena.

## Aprovechar el material existente de GLAB

```sh
python tools/prepare-reviewed-corpus.py --source-root RUTA/GLAB --out CARPETA_PRIVADA_NUEVA --negative-pack RUTA/manifest.json --browser-previews
```

`--negative-pack` es opcional y permite conservar un control sintético privado. `--browser-previews` conserva los originales MPEG-4 y añade copias H.264 para poder probarlos en el navegador; ambos pertenecen al mismo grupo de origen. Se produce un inventario que distingue correcciones humanas de fases y controles manuales de calidad. Se copian los vídeos disponibles y se crea un `manifest.json` importable en el laboratorio. Las copias idénticas se agrupan por huella; las etiquetas alternativas se conservan y los conflictos requieren reconciliación.

Las correcciones históricas se importan como borradores hasta alinearlas con el protocolo actual. El material de GLAB es de desarrollo/regresión: el modelo existente puede haberlo visto durante entrenamiento o selección, por lo que no se presenta como evaluación independiente. Los vídeos y sus metadatos permanecen fuera del repositorio público.

## Siguiente entrenamiento

- Congelar el protocolo y reconciliar etiquetas, incluidos casos sin swing, vistas no soportadas, clips recortados y fotogramas dudosos.
- Agrupar originales, recodificaciones y variantes del mismo swing, además del jugador. Evitar que un grupo aparezca en entrenamiento y evaluación; una huella de archivo por sí sola no detecta recodificaciones.
- Reservar una evaluación realmente independiente y no usarla para seleccionar versiones. Medir error y cobertura por fase, falsos positivos/negativos, velocidad y memoria en móviles.
- Entrenar por separado un detector de swing completo y, si las ventanas lo justifican, un refinador local de cada fase. Las ventanas reducidas ayudan al refinador; no sustituyen toda la secuencia que necesita el marcador global.
- Comparar cada candidato con la versión instalada y conservar la anterior. Publicar nuevos pesos solo después de comprobar que mejora los criterios acordados, junto con la paridad de la exportación y su rendimiento sin conexión.

El marcador actual fuerza una secuencia cuando hay suficiente movimiento; el filtro de imagen/movimiento no es un detector entrenado de presencia de swing. Los controles negativos reales deben permanecer en la evaluación, incluidos los que requieren una copia de vídeo compatible con el navegador. No se debe ajustar una regla solo para superar esos pocos ejemplos.
