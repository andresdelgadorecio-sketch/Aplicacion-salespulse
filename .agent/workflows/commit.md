---
description: Automatiza el proceso de git add, commit y push con un mensaje personalizado.
params:
  message: Mensaje para el commit (Requerido)
---

Sigue estos pasos para subir los cambios al repositorio:

1. Añade todos los cambios al stage.
   ```powershell
   git add .
   ```

2. Realiza el commit con el mensaje proporcionado por el usuario.
   ```powershell
   git commit -m "{{message}}"
   ```

3. Sube los cambios al repositorio remoto.
   ```powershell
   git push
   ```
