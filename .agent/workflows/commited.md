---
description: Automatiza el proceso de git status, add, commit y push con visualización previa de cambios.
---
Este workflow muestra los archivos pendientes, los añade y los sube a GitHub.

1.  **Estado Actual de Archivos**
    Muestra qué archivos han cambiado y están listos para subirse.
    ```powershell
    & "C:\Program Files\Git\cmd\git.exe" status
    ```

2.  **Añadir Cambios**
    Prepara todos los archivos modificados.
    ```powershell
    & "C:\Program Files\Git\cmd\git.exe" add .
    ```

3.  **Confirmar Cambios (Commit)**
    Guarda los cambios con tu mensaje.
    ```powershell
    & "C:\Program Files\Git\cmd\git.exe" commit -m "{{message}}"
    ```

4.  **Subir a GitHub (Push)**
    Envía los cambios a la nube para que Coolify los despliegue.
    ```powershell
    & "C:\Program Files\Git\cmd\git.exe" push
    ```
