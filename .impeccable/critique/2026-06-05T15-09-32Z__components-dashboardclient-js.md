---
target: components/DashboardClient.js
total_score: 23
p0_count: 0
p1_count: 1
timestamp: 2026-06-05T15-09-32Z
slug: components-dashboardclient-js
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton en OdooPanel/Macro, PDF spinner; falta estado de ultima sincronizacion visible |
| 2 | Match System / Real World | 3 | Terminologia financiera correcta; "trabajando datos" es amigable |
| 3 | User Control and Freedom | 2 | Modos TV/Presentacion sin Esc; sin undo; currency toggle sin confirmation |
| 4 | Consistency and Standards | 2 | Cards mezclan p-5/p-6; tab activo usa brand-600 en luz y sky-400 en dark directamente |
| 5 | Error Prevention | 2 | isExcelError() maneja datos rotos; PDF error usa alert() nativo |
| 6 | Recognition Rather Than Recall | 3 | Tabs etiquetadas con iconos; tooltip en currency; semaforo con labels |
| 7 | Flexibility and Efficiency | 2 | Sin keyboard shortcuts; sin deep-linking a tabs |
| 8 | Aesthetic and Minimalist Design | 2 | Control bar densa; Recomendacion card muy oscura; 4 KPI con 5 colores compiten |
| 9 | Help Users Recover from Errors | 3 | Reintentar en Odoo; trabajando datos badge; alert() para PDF es abrupto |
| 10 | Help and Documentation | 1 | Sin tooltips; sin onboarding; Tab 3 tiene reglas de semaforo |
| Total | | 23/40 | Acceptable |

## Anti-Patterns Verdict
Detector found 3 gray-on-color and 1 numbered-section-markers hits - all confirmed false positives (conditional class combinations that don't co-occur, utility class numbers misidentified).

## Priority Issues

[P1] Control toolbar desborda en pantallas medianas (768-1024px) - 5 controles en flex sin wrap
[P2] 4 KPI cards con identico peso visual - Facturacion no domina sobre Liquidez
[P2] Titulos KPI usan font-bold+uppercase+tracking-wider - triple-override del label muted
[P2] Recomendacion Wara GPS card tiene copy hardcoded que no refleja datos reales del mes
[P3] Tab labels con parentesis y ano hardcodeado son fragiles en responsive
