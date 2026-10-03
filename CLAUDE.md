# Reglas del proyecto

## Commits

- Tras terminar cada unidad de trabajo (feature, fix, refactor, docs, style, chore), hacer commit de inmediato, sin esperar a que el usuario lo pida.
- Un commit por cambio lógico. No mezclar cambios no relacionados en el mismo commit; agregar archivos por nombre, no con `git add -A`.
- Formato Conventional Commits: `tipo: descripción corta en imperativo` (`feat`, `fix`, `refactor`, `docs`, `style`, `chore`). Asunto de 50 caracteres o menos, en inglés. Cuerpo solo si el porqué no es obvio.
- No hacer `push` ni reescribir historial (amend, rebase, force) sin que el usuario lo pida.
- Si el árbol de trabajo tiene cambios previos ajenos a la tarea, no incluirlos en el commit.
