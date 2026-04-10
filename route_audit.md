# Informe de Auditoría de Rutas del Sistema (404)

Este documento detalla la discrepancia entre las rutas configuradas en el menú de navegación ([Sidebar](file:///c:/Users/ANTONIO/Desktop/front%20Hack/hackathon-platform-frontend/components/dashboard/sidebar.tsx#111-115)) y las páginas implementadas físicamente en el directorio `app`.

## 1. Panel de Estudiante (`STUDENT_NAV`)
| Menú (Etiqueta) | Ruta (Href) | Estado | Detalle |
| :--- | :--- | :--- | :--- |
| Dashboard | `/dashboard` | ✅ OK | |
| Hackathones | `/dashboard/hackathons` | ✅ OK | |
| **Mis Retos** | `/dashboard/challenges` | ❌ **404** | Carpeta no existe. |
| **Equipos** | `/dashboard/teams` | ❌ **404** | Carpeta existe pero sin [page.tsx](file:///c:/Users/ANTONIO/Desktop/front%20Hack/hackathon-platform-frontend/app/page.tsx). |
| Tabla de Posiciones | `/dashboard/leaderboard`| ✅ OK | |
| Mi Perfil | `/dashboard/profile` | ✅ OK | |

## 2. Panel de Tutor (`TUTOR_NAV`)
| Menú (Etiqueta) | Ruta (Href) | Estado | Detalle |
| :--- | :--- | :--- | :--- |
| Dashboard | `/tutor/dashboard` | ✅ OK | |
| **Hackathones** | `/tutor/hackathons` | ❌ **404** | Carpeta no existe. |
| **Biblioteca de Retos** | `/tutor/challenges` | ❌ **404** | Carpeta no existe. |
| Calificación | `/tutor/grading` | ✅ OK | |
| **Documentos** | `/tutor/documents` | ❌ **404** | Carpeta no existe. |
| Mis Equipos | `/tutor/teams` | ✅ OK | |
| **Estudiantes** | `/tutor/students` | ❌ **404** | Carpeta no existe. |
| **Generación IA** | `/tutor/ai-generation` | ❌ **404** | Carpeta no existe. |

## 3. Panel de Administrador (`ADMIN_NAV`)
| Menú (Etiqueta) | Ruta (Href) | Estado | Detalle |
| :--- | :--- | :--- | :--- |
| **Grupos de Investigación**| `/admin/research-groups`| ❌ **404** | Carpeta no existe. |
| *Resto de rutas* | *Varios* | ✅ OK | Implementado. |

## 4. Panel de Director de Investigación (`DIRECTOR_NAV`)
| Menú (Etiqueta) | Ruta (Href) | Estado | Detalle |
| :--- | :--- | :--- | :--- |
| Dashboard | `/research/dashboard` | ✅ OK | |
| Mis Grupos | `/research/groups` | ✅ OK | |
| **Hackathones** | `/research/hackathons` | ❌ **404** | Carpeta no existe. |

## 5. Panel de Super Administrador (`SUPERADMIN_NAV`)
| Menú (Etiqueta) | Ruta (Href) | Estado | Detalle |
| :--- | :--- | :--- | :--- |
| Dashboard Global | `/superadmin` | ✅ OK | |
| Zonas | `/superadmin/zones` | ✅ OK | |
| Sedes | `/superadmin/sedes` | ✅ OK | |
| Solic. Recursos | `/superadmin/resources` | ✅ OK | |
| Logs Auditoría | `/superadmin/audit` | ✅ OK | |

---

### Diagnóstico Final
El sistema de navegación está preparado para un alcance mayor al implementado en el frontend. Las rutas marcadas con ❌ **404** requieren la creación de sus respectivos directorios y archivos [page.tsx](file:///c:/Users/ANTONIO/Desktop/front%20Hack/hackathon-platform-frontend/app/page.tsx) en la carpeta `app/`.
