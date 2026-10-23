# Nutrition & Fueling

Sources: Asker Jeukendrup (carbohydrate intake / gut training), Louise Burke (carb periodization, LCHF), Trent Stellingwerff (fuel-for-the-work-required), Precision Fuel & Hydration (sweat/sodium).

## Jeukendrup gut-training protocol (10-week progression)

"Train the gut like you train the muscles" — progressive overload of fueling tolerance.

- **Weeks 1–2:** train fluid tolerance — **400–500 ml pre-exercise.**
- **Weeks 3–4:** introduce **30–40 g carb/hour** during low-intensity sessions.
- **Weeks 5–7:** progress to **60–90 g/hour** using multiple transportable carbohydrates (**2:1 glucose:fructose**).
- **Weeks 8–10:** test individual maximum (up to **120 g/hour**); rehearse exact race-day strategy.

## Burke periodized carbohydrate approach

Carbohydrate intake matched to the day's demand (body-weight based):

- **Recovery/easy days:** **5–7 g/kg/day.**
- **High-volume days:** **8–10 g/kg/day.**
- **Pre-race loading:** **10–12 g/kg/day for 36–48 h** before the race.
- **LCHF caution:** low-carb/high-fat diets reduce exercise economy by roughly **5–8%** despite ~doubling fat oxidation — net negative for race performance. High carbohydrate **availability** is the evidence-backed default for racing, not LCHF.

## Stellingwerff — "fuel for the work required"

- Match carbohydrate intake to **session intensity and goal**, not a fixed daily number.
- **Strategic "train-low" sessions:** max **2–3/week**, never consecutive, never before quality work, only in base periods.
- **High availability** for threshold, VO2max, and long sessions — fuel the work that demands it.

## Race-day fueling

- **< 2.5 h events:** **~60 g/hour**, single carbohydrate source acceptable.
- **> 2.5 h events:** **90–120 g/hour** using multiple transportable carbohydrates (**2:1 glucose:fructose**) to exceed the single-transporter ceiling.
- **Rehearse the exact race strategy in training** — no new products or amounts on race day.

## Hydration & sodium (Precision Fuel & Hydration)

- **Determine sweat rate:** pre/post body weight + fluid consumed during a session.
- **Sodium concentration is highly individual** — genetic range ~**200–2000 mg/L** of sweat; sweat-sodium testing gives a real number.
- **Target ~300–600 mg sodium/hour** when racing.
- **Replace 80–100% of sweat losses — never chronically over-drink** (hyponatremia risk). Aim to limit losses, not to fully match intake to sweat.

## Session fueling matrix

Every session gets a fuel recommendation, rest and gym days included. Pick exactly one row by session type, then size it by duration. An easy run under 60′ that a `dated_extras` item marks as a gut rep (a gel on an easy run) uses the "Easy run with a planned gut-rep gel" row, not the "< 60′" row. A gut-rep easy run of 60-90′ uses the "Easy run 60-90′" row, with the gut-rep gel as its During. Rationale for the gut ramp lives in the vault: the active plan's `rationale.vault_path` (plan.yaml) § Gut plan (link, don't copy). The date-window ramp (which gel interval applies when) is applied on top of the long and race-specific rows; the windows are the active plan's `ramp_windows` and the dated items its `dated_extras` (plan.yaml), applied as [notion.md](../adapters/notion.md) § Ramp windows (active plan) describes.

Every session gets **before + during**. **After** (carbs + protein within 1 h) is added for long runs and key sessions only (rows marked after: yes).

`<…>` in a row is filled from profile.yaml, grams rounded to the nearest 5 g.

| Session type | Before | During | After |
|---|---|---|---|
| Rest day + GOWOD | Daily note only: 5-7 g/kg (<5×weight>-<7×weight> g at <weight> kg), protein about 1.6 g/kg. Optional banana or snack. | Water. No carbs. | No |
| ATG strength gym | Normal meal 2-3 h before, or a banana if hungry. | Water. No carbs. | No (eat the next normal meal) |
| Easy run < 60′ (3-10 km, with or without strides) | Normal meal 2-3 h before. | Water only. | No |
| Easy run with a planned gut-rep gel | Normal meal 2-3 h before. | 1 gel at 30′ with 150-200 ml water. Exception to "< 60′ = water only": a planned gut rep is a training stimulus, not a fuel need. | No |
| Easy run 60-90′ | Carb-containing meal or snack 1-3 h before. | 30-40 g/h, sipped with water. Carbs optional if it is truly easy and fed. | No |
| Threshold / fartlek (quality) | 1-2 g/kg carbs 2-3 h before, or a lighter 1 g/kg if 1-2 h out. | 30-60 g/h from the start, with water. Session under about 60′ in total: 1 gel before the first rep (fartlek: at the start) with 150-200 ml water, not the g/h range. | After: yes |
| MP session | Same as threshold; no gel 15′ before and no window breakfast. | 40-60 g/h, following the gel interval for the date; test the race gel at MP. Session under about 60′ in total: 1 gel between rep 1 and rep 2 with 150-200 ml water, not the g/h range or the date's gel interval. | After: yes |
| Long run > 90′ (12-28 km) | Breakfast drill: 1-4 g/kg in the 1-4 h before, building toward about 150 g (2 g/kg) 3 h out, then a gel 15′ before the start. | Gel ramp by date window in g/h, each gel with 150-200 ml water. | After: yes |
| Long run with MP finish | As long run. | As long run, with a gel timed just before the MP block. | After: yes |
| 10 km time trial | As threshold (1-2 g/kg, 2-3 h before), gel 15′ before optional. | Water. Carbs not needed under about 45-60′ of hard effort. | After: yes |
| Dress rehearsal | Exact race breakfast and timing, gel 15′ before. | Exact race plan: race-dose g/h, race water and sodium (see below). No new products. | After: yes |
| Carb-load days | 8-10 g/kg/day (<8×weight>-<10×weight> g at <weight> kg), low fibre, low FODMAP, partly as drinks (Burke). | Water; sip through the day. | Not applicable |
| Race | Race breakfast as rehearsed, gel 15′ before the start. | The active plan's race dose: plan.yaml `race_dose_cap` (`min`-`max` g/h, the highest symptom-free dose from training), each gel with water; sodium 300-600 mg/h since it runs > 2.5 h. | After: yes |

Race dose note: the general race-day rule above says 90-120 g/h for events over 2.5 h, but when the active plan sets `race_dose_cap` (plan.yaml), that cap wins ("don't chase 90 g/h"). Use the plan figure.

### Guardrails

- **Fueled start to finish, never drastically over-carbed.** Stay at or under the row's g/h; do not stack extra gels, drinks and snacks to "be safe". More carbs than the gut has been trained for is how cramps start.
- **Don't fuel what doesn't need it.** Easy runs under 60′, gym and rest days get no in-session carbs, with the one exception below.
- **Gut-training exception:** a planned gut rep (e.g. 1 gel at 30′ on an easy run, or a gel at MP, as set in the active plan's `dated_extras`) overrides "< 60′ = water only".
- **Products only from the pantry** in profile.yaml `pantry.products` (rules in [athlete-data.md](athlete-data.md) § Fueling profile). Anything not listed is written as generic grams of carbs. Do not count grams from products marked unverified.
- **Never a new product or dose on race day.** Rehearse it first.
