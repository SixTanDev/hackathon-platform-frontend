# ============================================================
# merge-surgery.ps1
# repo-fixes-audit -> develop | hackathon-platform-frontend
# Ejecutar por fases desde VS Code Terminal (PowerShell)
# NUNCA ejecutar como script completo de una vez
# ============================================================

$REPO = "C:\Users\JhonZapata\Desktop\work\hackathon-platform-frontend"
$WORK_BRANCH = "merge-surgery-work"
$SOURCE_BRANCH = "repo-fixes-audit"

Set-Location $REPO

function Write-Phase($n, $msg) {
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host " FASE $n - $msg" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
}

function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "  [INFO] $msg" -ForegroundColor Gray }
function Pause-Manual($msg) {
    Write-Host ""
    Write-Host "  ---- ACCION MANUAL REQUERIDA ----" -ForegroundColor Magenta
    Write-Host "  $msg" -ForegroundColor Magenta
    Write-Host "  Presiona ENTER cuando hayas terminado..."
    Read-Host
}

# ============================================================
# FASE 0 - VERIFICACION DE ESTADO INICIAL
# Copiar y pegar SOLO esta seccion para empezar
# ============================================================
function Fase0-Verificar {
    Write-Phase 0 "VERIFICACION DE ESTADO INICIAL"

    $branch = git branch --show-current
    if ($branch -ne $SOURCE_BRANCH) {
        Write-Fail "No estas en $SOURCE_BRANCH. Rama actual: $branch"
        Write-Info "Ejecuta: git checkout $SOURCE_BRANCH"
        return
    }
    Write-OK "Rama correcta: $SOURCE_BRANCH"

    $status = git status --short
    if ($status) {
        Write-Warn "Hay cambios sin commitear:"
        Write-Host $status
        $resp = Read-Host "  Deseas hacer stash? (s/n)"
        if ($resp -eq "s") {
            git stash push -m "pre-merge-surgery" --include-untracked
            Write-OK "Stash creado: 'pre-merge-surgery'"
        } else {
            Write-Warn "Continuando sin stash. Riesgo de perdida de cambios."
        }
    } else {
        Write-OK "Working tree limpio"
    }
}

# ============================================================
# FASE 1 - FETCH Y GENERACION DE DIFFS
# Ejecutar COMPLETA. Luego leer los .patch antes de continuar.
# ============================================================
function Fase1-FetchYDiffs {
    Write-Phase 1 "FETCH Y GENERACION DE DIFFS"

    git fetch origin develop
    Write-OK "fetch completado"

    $patches = @{
        "diff_login.patch"            = "app/(auth)/login/page.tsx"
        "diff_hackathon_detail.patch" = "app/(dashboard)/dashboard/hackathons/[id]/page.tsx"
        "diff_auth_helpers.patch"     = "lib/auth-helpers.ts"
        "diff_challenge_svc.patch"    = "lib/api/challenge-admin-services.ts"
        "diff_topbar.patch"           = "components/dashboard/topbar.tsx"
    }

    foreach ($out in $patches.Keys) {
        $file = $patches[$out]
        git diff "origin/develop...HEAD" -- $file | Out-File $out -Encoding utf8
        Write-OK "Generado: $out"
    }

    Write-Host ""
    Write-Warn "PAUSA OBLIGATORIA: Lee los 5 archivos .patch antes de continuar."
    Write-Info "Abrirlos con: notepad diff_login.patch"
    Write-Info "Archivos generados en: $REPO"

    Pause-Manual "Confirma que leiste los 5 .patch y escribe ENTER para continuar."
}

# ============================================================
# FASE 2 - CREAR RAMA DE TRABAJO
# ============================================================
function Fase2-CrearRama {
    Write-Phase 2 "CREAR RAMA DE TRABAJO"

    $exists = git branch --list $WORK_BRANCH
    if ($exists) {
        Write-Warn "La rama $WORK_BRANCH ya existe."
        $resp = Read-Host "  Eliminarla y recrearla? (s/n)"
        if ($resp -eq "s") {
            git branch -D $WORK_BRANCH
        } else {
            Write-Info "Usando rama existente."
            git checkout $WORK_BRANCH
            return
        }
    }

    git checkout -b $WORK_BRANCH
    $current = git branch --show-current
    if ($current -eq $WORK_BRANCH) {
        Write-OK "Rama creada y activa: $WORK_BRANCH"
    } else {
        Write-Fail "No se pudo crear la rama $WORK_BRANCH"
    }
}

# ============================================================
# FASE 3 - INICIAR MERGE
# ============================================================
function Fase3-IniciarMerge {
    Write-Phase 3 "INICIAR MERGE"

    git merge origin/develop --no-edit
    $conflictos = git diff --name-only --diff-filter=U
    if ($conflictos) {
        Write-Warn "Conflictos detectados:"
        $conflictos | ForEach-Object { Write-Host "    $_" }
        $conflictos | Out-File "conflict_files.txt" -Encoding utf8
        Write-OK "Lista guardada en conflict_files.txt"
    } else {
        Write-OK "Merge sin conflictos. Verifica si era esperado."
    }
}

# ============================================================
# FASE 4 - RESOLVER: TAKE REPO-FIXES-AUDIT (14 archivos)
# ============================================================
function Fase4-TakeOurs {
    Write-Phase 4 "RESOLVER - TAKE REPO-FIXES-AUDIT"

    $directFiles = @(
        "app/(admin)/layout.tsx",
        "app/(dashboard)/layout.tsx",
        "app/(tutor)/layout.tsx",
        "app/(auth)/select-sede/page.tsx",
        "app/(dashboard)/dashboard/page.tsx",
        "app/(dashboard)/dashboard/hackathons/page.tsx",
        "app/(dashboard)/dashboard/hackathons/[id]/challenges/[cid]/page.tsx",
        "app/(dashboard)/dashboard/challenges/[id]/page.tsx",
        "app/(dashboard)/dashboard/profile/page.tsx",
        "app/(dashboard)/dashboard/teams/page.tsx",
        "app/(dashboard)/dashboard/leaderboard/page.tsx",
        "app/(tutor)/tutor/challenges/page.tsx",
        "app/(admin)/admin/challenges/page.tsx",
        "app/(admin)/admin/dashboard/page.tsx"
    )

    $conflictos = git diff --name-only --diff-filter=U
    foreach ($f in $directFiles) {
        $normalizado = $f -replace "\\", "/"
        $estaEnConflicto = $conflictos | Where-Object { ($_ -replace "\\", "/") -eq $normalizado }
        if ($estaEnConflicto) {
            git checkout --ours -- $f
            git add -- $f
            Write-OK "Resuelto (ours): $f"
        } else {
            Write-Info "Sin conflicto (skip): $f"
        }
    }
}

# ============================================================
# FASE 5 - MERGE MANUAL: login/page.tsx
# REQUIRES MANUAL CONFIRMATION
# ============================================================
function Fase5-ManualLogin {
    Write-Phase 5 "MERGE MANUAL - login/page.tsx"

    Write-Warn "REQUIRES MANUAL CONFIRMATION"
    Write-Host ""
    Write-Host "  Reglas de resolucion:" -ForegroundColor White
    Write-Host "  - syncCookies()              -> Accept Current Change (repo-fixes-audit)"
    Write-Host "  - rama superadmin sin sedes  -> Accept Current Change"
    Write-Host "  - auto-select con 1 sede     -> Accept Current Change"
    Write-Host "  - catch de /select-context   -> comparar con diff_login.patch y decidir"
    Write-Host "  - JSX del formulario         -> Accept Current Change"
    Write-Host ""

    code "app/(auth)/login/page.tsx"
    Pause-Manual "Resuelve todos los marcadores en login/page.tsx y presiona ENTER."

    $markers = Get-Content "app/(auth)/login/page.tsx" | Select-String "^<<<<<<< "
    if ($markers) {
        Write-Fail "Aun hay marcadores de conflicto en login/page.tsx. Resuelvelos primero."
    } else {
        git add -- "app/(auth)/login/page.tsx"
        Write-OK "login/page.tsx resuelto y anadido al index"
    }
}

# ============================================================
# FASE 6 - MERGE MANUAL: hackathons/[id]/page.tsx
# REQUIRES MANUAL CONFIRMATION
# ============================================================
function Fase6-ManualHackathon {
    Write-Phase 6 "MERGE MANUAL - hackathons/[id]/page.tsx"

    Write-Warn "REQUIRES MANUAL CONFIRMATION"
    Write-Host ""
    Write-Host "  Reglas de resolucion:" -ForegroundColor White
    Write-Host "  - CountdownDisplay / useCountdown -> Accept Current Change"
    Write-Host "  - isRegOpen, isWindowClosed       -> Accept Current Change"
    Write-Host "  - LeaderboardTab con polling      -> Accept Current Change"
    Write-Host "  - createMutation payload          -> comparar con diff_hackathon_detail.patch"
    Write-Host "  - inviteMutation                  -> comparar con diff_hackathon_detail.patch"
    Write-Host "  - cancelRegistration              -> comparar con diff_hackathon_detail.patch"
    Write-Host "  - RulesTab y hero JSX             -> Accept Current Change"
    Write-Host ""

    code "app/(dashboard)/dashboard/hackathons/[id]/page.tsx"
    Pause-Manual "Resuelve todos los marcadores en hackathons/[id]/page.tsx y presiona ENTER."

    $markers = Get-Content "app/(dashboard)/dashboard/hackathons/[id]/page.tsx" | Select-String "^<<<<<<< "
    if ($markers) {
        Write-Fail "Aun hay marcadores en hackathons/[id]/page.tsx. Resuelvelos primero."
    } else {
        git add -- "app/(dashboard)/dashboard/hackathons/[id]/page.tsx"
        Write-OK "hackathons/[id]/page.tsx resuelto y anadido al index"
    }
}

# ============================================================
# FASE 7 - NON-CONFLICT FIXES
# ============================================================
function Fase7-NonConflictFixes {
    Write-Phase 7 "NON-CONFLICT FIXES"

    # FIX 1: topbar.tsx - hook condicional
    Write-Info "Verificando topbar.tsx linea 61..."
    $hookBug = Select-String -Path "components/dashboard/topbar.tsx" -Pattern "role \|\| useAuthStore"
    if ($hookBug) {
        Write-Warn "Bug de hook condicional detectado. Abre y corrige:"
        Write-Host "  ANTES:  const currentRole = role || useAuthStore((s) => s?.currentRole);"
        Write-Host "  DESPUES (DOS lineas):"
        Write-Host "          const storeRole = useAuthStore((s) => s?.currentRole);"
        Write-Host "          const currentRole = role ?? storeRole;"
        code "components/dashboard/topbar.tsx"
        Pause-Manual "Aplica el fix en topbar.tsx y presiona ENTER."
        git add -- "components/dashboard/topbar.tsx"
        Write-OK "topbar.tsx corregido"
    } else {
        Write-OK "topbar.tsx - hook correcto (o develop ya lo corrigio)"
    }

    # FIX 2: auth-helpers.ts - REQUIRES MANUAL CONFIRMATION
    Write-Info "Verificando diff_auth_helpers.patch..."
    Write-Warn "REQUIRES MANUAL CONFIRMATION: Lee diff_auth_helpers.patch"
    Write-Host "  develop anadio 'case superadmin' en getDashboardPathForRole?"
    $resp = Read-Host "  (s = si, anadirlo / n = no, omitir)"
    if ($resp -eq "s") {
        code "lib/auth-helpers.ts"
        Pause-Manual "Anade el case superadmin y presiona ENTER."
        git add -- "lib/auth-helpers.ts"
        Write-OK "auth-helpers.ts actualizado"
    } else {
        Write-OK "auth-helpers.ts - sin cambios requeridos"
    }

    # FIX 3: challenge-admin-services.ts - REQUIRES MANUAL CONFIRMATION
    Write-Info "Verificando diff_challenge_svc.patch..."
    Write-Warn "REQUIRES MANUAL CONFIRMATION: Lee diff_challenge_svc.patch"
    Write-Host "  develop cambio el endpoint de approveChallenge?"
    $resp = Read-Host "  (s = si, actualizar / n = no, omitir)"
    if ($resp -eq "s") {
        code "lib/api/challenge-admin-services.ts"
        Pause-Manual "Actualiza el endpoint y presiona ENTER."
        git add -- "lib/api/challenge-admin-services.ts"
        Write-OK "challenge-admin-services.ts actualizado"
    } else {
        Write-OK "challenge-admin-services.ts - sin cambios requeridos"
    }
}

# ============================================================
# FASE 8 - VERIFICAR SIN MARCADORES Y BUILD
# ============================================================
function Fase8-BuildYVerificar {
    Write-Phase 8 "VERIFICACION FINAL Y BUILD"

    # Verificar sin marcadores
    $markers = Get-ChildItem -Path "app","components","lib","stores","hooks","types" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
        Select-String -Pattern "^<<<<<<< " |
        Measure-Object
    if ($markers.Count -gt 0) {
        Write-Fail "Hay $($markers.Count) marcadores de conflicto sin resolver"
        Get-ChildItem -Path "app","components","lib","stores","hooks","types" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
            Select-String -Pattern "^<<<<<<< " |
            Select-Object Filename, LineNumber
        return
    }
    Write-OK "Sin marcadores de conflicto"

    # Build
    Write-Info "Ejecutando npm run build..."
    npm run build 2>&1 | Tee-Object -FilePath "build_output.txt"
    $buildExitCode = $LASTEXITCODE
    if ($buildExitCode -ne 0) {
        Write-Fail "Build fallo con codigo de salida $buildExitCode. Revisa build_output.txt antes de continuar."
        return
    }
    $buildErrors = Select-String -Path "build_output.txt" -Pattern "error TS|Failed to compile|Type error" | Measure-Object
    if ($buildErrors.Count -gt 0) {
        Write-Fail "Build tiene errores TypeScript. Resolver antes de continuar."
        Select-String -Path "build_output.txt" -Pattern "error TS|Failed to compile|Type error"
        return
    }
    Write-OK "Build limpio"
}

# ============================================================
# FASE 9 - SAFETY GATES
# ============================================================
function Fase9-SafetyGates {
    Write-Phase 9 "SAFETY GATES"

    # Gate 1
    $m = (Get-ChildItem -Path "app","components","lib","stores","hooks","types" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue | Select-String "^<<<<<<< " | Measure-Object).Count
    if ($m -gt 0) { Write-Fail "GATE 1: $m marcadores sin resolver" } else { Write-OK "GATE 1: Sin marcadores" }

    # Gate 2
    if (-not (Test-Path "build_output.txt")) {
        Write-Fail "GATE 2: No existe build_output.txt. Ejecuta Fase8 primero."
    } else {
        $e = (Select-String -Path "build_output.txt" -Pattern "error TS|Failed to compile" -ErrorAction SilentlyContinue | Measure-Object).Count
        $buildOutput = Get-Content "build_output.txt" -Raw
        $buildExitFailed = $buildOutput -match "Build fallo con codigo de salida|spawn EPERM|Build error occurred|ELIFECYCLE|npm ERR!"
        if ($e -gt 0 -or $buildExitFailed) { Write-Fail "GATE 2: Errores en build" } else { Write-OK "GATE 2: Build limpio" }
    }

    # Gate 3
    $h = (Select-String -Path "components/dashboard/topbar.tsx" -Pattern "role \|\| useAuthStore" | Measure-Object).Count
    if ($h -gt 0) { Write-Fail "GATE 3: Hook condicional en topbar.tsx" } else { Write-OK "GATE 3: Hook correcto" }

    # Gate 4
    $a = (Select-String -Path "app/(admin)/layout.tsx" -Pattern "allowNoContext" | Measure-Object).Count
    if ($a -eq 0) { Write-Fail "GATE 4: allowNoContext perdido en admin layout" } else { Write-OK "GATE 4: allowNoContext presente" }

    # Gate 5
    $s = (Select-String -Path "app/(tutor)/tutor/challenges/page.tsx" -Pattern "pending_approval" | Measure-Object).Count
    if ($s -eq 0) { Write-Fail "GATE 5: submitForReviewMut perdido - pipeline tutor->admin roto" } else { Write-OK "GATE 5: Pipeline tutor->admin intacto" }

    # Gate 6
    $w = (Select-String -Path "app/(dashboard)/dashboard/hackathons/page.tsx" -Pattern "filter" -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($w -eq 0) { Write-Warn "GATE 6: Verificar manualmente que los tabs de hackathons filtran correctamente" } else { Write-OK "GATE 6: Filtro de hackathons presente" }

    Write-Host ""
    Write-Warn "GATE 7 (MANUAL): Ejecuta 'npm run dev' y verifica:"
    Write-Host "  1. Login estudiante -> /dashboard"
    Write-Host "  2. Login admin     -> /admin/dashboard"
    Write-Host "  3. Login tutor     -> /tutor/dashboard"
    Write-Host "  4. Cookies en DevTools: hackathon-auth-token, hackathon-context-token, hackathon-role"
}

# ============================================================
# FASE 10 - COMMIT Y PUSH
# ============================================================
function Fase10-CommitYPush {
    Write-Phase 10 "COMMIT Y PUSH"

    git status --short
    Write-Host ""
    $resp = Read-Host "Confirmas el commit? (s/n)"
    if ($resp -ne "s") {
        Write-Warn "Commit cancelado por el usuario."
        return
    }

    git commit -m "resolve: merge repo-fixes-audit into develop

- take repo-fixes-audit: 14 conflicting files
- manual merge: app/(auth)/login/page.tsx
- manual merge: app/(dashboard)/dashboard/hackathons/[id]/page.tsx
- fix: conditional hook in components/dashboard/topbar.tsx
- verify: approveChallenge endpoint confirmed
- verify: getDashboardPathForRole completeness confirmed
- preserved: allowNoContext in admin layout
- preserved: hackathon status filter workaround
- preserved: submitForReviewMut (tutor->admin pipeline)
- preserved: approveMut (admin approval flow)"

    git push origin $WORK_BRANCH
    Write-OK "Push completado: $WORK_BRANCH"
    Write-Info "Abre un PR en GitHub: $WORK_BRANCH -> develop"
}

# ============================================================
# RECOVERY - Si algo salio mal
# ============================================================
function Recovery-Reset {
    Write-Phase "R" "RECOVERY - DESCARTAR Y VOLVER AL INICIO"
    Write-Warn "Esto descarta la rama de trabajo y restaura el estado original."
    $resp = Read-Host "Confirmas? (s/n)"
    if ($resp -eq "s") {
        git checkout $SOURCE_BRANCH
        git branch -D $WORK_BRANCH
        $stashList = git stash list | Select-String "pre-merge-surgery"
        if ($stashList) {
            git stash pop
            Write-OK "Stash restaurado"
        } else {
            Write-Info "No hay stash pre-merge-surgery para restaurar"
        }
        Write-OK "Recovery completado. Estas de vuelta en $SOURCE_BRANCH"
    }
}

# ============================================================
# MENU DE EJECUCION POR FASES
# ============================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      MERGE SURGERY - Ejecucion por Fases" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Funciones disponibles:" -ForegroundColor White
Write-Host "  Fase0-Verificar        - Verifica estado inicial"
Write-Host "  Fase1-FetchYDiffs      - Fetch y genera .patch para revision"
Write-Host "  Fase2-CrearRama        - Crea rama merge-surgery-work"
Write-Host "  Fase3-IniciarMerge     - Inicia el merge (produce conflictos)"
Write-Host "  Fase4-TakeOurs         - Resuelve 14 archivos automaticamente"
Write-Host "  Fase5-ManualLogin      - Merge manual de login/page.tsx"
Write-Host "  Fase6-ManualHackathon  - Merge manual de hackathons/[id]/page.tsx"
Write-Host "  Fase7-NonConflictFixes - Fixes en topbar, auth-helpers, challenge-svc"
Write-Host "  Fase8-BuildYVerificar  - Verifica marcadores y ejecuta build"
Write-Host "  Fase9-SafetyGates      - Ejecuta todos los gates de seguridad"
Write-Host "  Fase10-CommitYPush     - Commit y push de la rama de trabajo"
Write-Host "  Recovery-Reset         - Descarta todo y vuelve al inicio"
Write-Host ""
Write-Host "Ejecutar en orden: Fase0 -> Fase1 -> ... -> Fase10" -ForegroundColor Yellow
Write-Host "NO ejecutar como script completo. Solo llamar cada funcion." -ForegroundColor Red
