# Lesson content format

Lesson content in the Training tab is **Markdown** with a few extras: tables, callout boxes, images and drawn visuals. The course builder's lesson box has buttons that insert each of these as a template, and a **Preview** button. Older plain-text lessons still render as paragraphs.

Rendering lives in `lib/lessonContent.ts` (parsing and validation) and `components/training/LessonContent.tsx` / `LessonVisuals.tsx` (display). Text is never rendered as HTML.

## Text

```
## Section heading        (### and #### for smaller ones)
**bold**, *italic*, `code`, [link text](https://example.com)
- bullet item
1. numbered item
---                       (a divider)
```

A blank line starts a new paragraph. A single line break is kept as written.

## Tables

```
| Marker | Lab range | Functional target |
| --- | --- | --- |
| Ferritin | 15–150 ng/mL | 50–150 ng/mL |
```

Use `:---:` or `---:` in the divider row to centre or right-align a column. Up to 60 rows.

## Callout boxes (explainers)

```
> [!KEY] Optional title
> The main takeaway. Can be several lines, lists or a table.
```

Kinds: `NOTE`, `TIP`, `KEY` (key point), `WARNING` (red flag / when to refer), `EXAMPLE` (case or worked example).

## Images

```
![What the image shows](https://… "Optional caption")
```

The URL must start with `https://` or `/`.

## Drawn visuals

Write a fenced block whose language is the visual's kind, containing JSON. A block with a mistake shows a red notice in the builder's preview (and nothing for learners), so check the preview.

### `chart`: bar, column, line or donut

Single series, shorthand:

````
```chart
{ "type": "bar", "title": "…", "unit": "%", "caption": "…",
  "data": [ { "label": "A", "value": 42 }, { "label": "B", "value": 27 } ] }
```
````

Several series:

````
```chart
{ "type": "line", "title": "…", "unit": "mg/dL",
  "labels": ["Week 0", "Week 4", "Week 8"],
  "series": [ { "name": "Glucose", "values": [118, 105, 96] } ] }
```
````

- `bar` (horizontal): ranking categories. `column`: comparing a few groups (up to 6 series). `line`: change over time (up to 3 series). `donut`: parts of a whole (one series, up to 6 slices; group the rest as "Other").
- Every chart has a **Show as table** button and hover values. Use real numbers only, and say where they come from in `caption`. If there are no real numbers, use an infographic instead of inventing data.

### `steps`: a process, 2–8 steps

```
{ "title": "…", "steps": [ { "title": "…", "text": "…" } ] }
```

### `compare`: 2–3 side-by-side columns

```
{ "title": "…", "columns": [ { "heading": "…", "tone": "neutral", "points": ["…"] } ] }
```

`tone` (optional): `good`, `warning`, `serious`, `critical` or `neutral`. Toned columns carry an icon, so the colour is never the only signal.

### `stats`: 1–4 headline numbers

```
{ "title": "…", "items": [ { "value": "70%", "label": "…", "note": "…" } ] }
```

### `cycle`: a loop of 3–8 stages

```
{ "title": "…", "center": "…", "items": ["Stage 1", "Stage 2", "Stage 3"] }
```

### `timeline`: 2–10 points in time

```
{ "title": "…", "items": [ { "when": "Week 1", "title": "…", "text": "…" } ] }
```

### `hub`: one idea and 3–8 connected factors

```
{ "title": "…", "center": "…", "items": [ { "label": "…", "text": "…" } ] }
```

### `range`: a lab result on its reference bands

```
{ "title": "…", "unit": "ng/mL", "min": 0, "max": 300,
  "bands": [ { "from": 0, "to": 30, "label": "Low", "tone": "serious" } ],
  "markers": [ { "value": 22, "label": "Patient: 22" } ], "caption": "…" }
```

Up to 6 bands and 3 markers. Values outside `min`–`max` are clamped.

### `body`: a numbered body map (illustration)

```
{ "title": "…", "items": [ { "system": "gut", "label": "Gut", "text": "…" } ] }
```

`system` is one of: brain, thyroid, heart, lungs, liver, stomach, gallbladder, pancreas, gut, adrenals, kidneys, reproductive, skin, muscles, bones, immune, blood, nerves. Up to 10 items.

## Writing guidance

- Add a visual where it makes the idea easier to grasp: a process (steps), a comparison (compare or a table), a loop (cycle), connected causes (hub), lab interpretation (range), where symptoms appear (body). Roughly 1–3 per module, not one per paragraph.
- Keep the surrounding text. A visual supports the explanation; it doesn't replace it.
- Don't invent statistics. Charts and `stats` use figures already in the lesson, or well-established figures stated with their basis in a `caption` or `note`.
- Don't name where course material came from (talks, videos, speakers or schools). FXMed presents courses as its own training.
