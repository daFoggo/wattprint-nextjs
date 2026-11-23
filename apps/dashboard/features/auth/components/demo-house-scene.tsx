"use client"

import { useId } from "react"

import { Shapes } from "@workspace/ui/components/hairline/empty-state"
import {
  TILE,
  VIEW,
  box,
  project,
  type SceneFill,
  type SceneShape,
  type SceneStroke,
} from "@workspace/ui/components/hairline/empty-state-scenes"

type Vec3 = [number, number, number]

/** A flat face through these points (tile units), in the EmptyState style. */
const face = (
  points: Vec3[],
  fill: SceneFill,
  stroke: SceneStroke = "line"
): SceneShape => ({
  d:
    points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${project(p)
            .map((v) => v.toFixed(2))
            .join(" ")}`
      )
      .join(" ") + (fill === "none" ? "" : " Z"),
  fill,
  stroke,
})

/** A circle drawn on the front-left face of a box (the plane y = constant). */
const ring = (cx: number, y: number, cz: number, r: number) =>
  face(
    Array.from({ length: 33 }, (_, i): Vec3 => {
      const a = (i / 32) * Math.PI * 2
      return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)]
    }),
    "glass"
  )

/** The house: walls, a door and a window, a gable roof with its ridge along x. */
function house(): SceneShape[] {
  const [x0, y0, w, d, h, ridge] = [0.6, 0.6, 3, 2.6, 1.7, 1.1]
  const [X, Y, ym, R, o] = [x0 + w, y0 + d, y0 + d / 2, h + ridge, 0.2]
  return [
    ...box(x0, y0, 0, w, d, h).slice(0, 2),
    face(
      [
        [x0 + 0.5, Y, 0],
        [x0 + 1.15, Y, 0],
        [x0 + 1.15, Y, 1.15],
        [x0 + 0.5, Y, 1.15],
      ],
      "hole"
    ),
    face(
      [
        [X, y0 + 0.8, 0.75],
        [X, y0 + 1.8, 0.75],
        [X, y0 + 1.8, 1.3],
        [X, y0 + 0.8, 1.3],
      ],
      "glass"
    ),
    face(
      [
        [x0 - o, y0 - o, h],
        [X + o, y0 - o, h],
        [X + o, ym, R],
        [x0 - o, ym, R],
      ],
      "accent"
    ),
    face(
      [
        [X, y0, h],
        [X, Y, h],
        [X, ym, R],
      ],
      "right"
    ),
    face(
      [
        [x0 - o, Y + o, h],
        [X + o, Y + o, h],
        [X + o, ym, R],
        [x0 - o, ym, R],
      ],
      "accent-side",
      "accent"
    ),
  ]
}

/** One appliance standing at (x, y), picked by its NILM label; an unknown label is a plain box. */
function appliance(label: string, x: number, y: number): SceneShape[] {
  switch (label) {
    case "Fridge":
      return [
        ...box(x, y, 0, 0.8, 0.8, 2),
        face(
          [
            [x, y + 0.8, 1.35],
            [x + 0.8, y + 0.8, 1.35],
          ],
          "none"
        ),
      ]
    case "WashMach":
      return [
        ...box(x, y, 0, 0.9, 0.9, 0.95),
        ring(x + 0.45, y + 0.9, 0.42, 0.26),
      ]
    case "Dishwash":
      return [
        ...box(x, y, 0, 0.9, 0.9, 0.9),
        face(
          [
            [x, y + 0.9, 0.72],
            [x + 0.9, y + 0.9, 0.72],
          ],
          "none"
        ),
        face(
          [
            [x + 0.3, y + 0.9, 0.6],
            [x + 0.6, y + 0.9, 0.6],
          ],
          "none",
          "accent"
        ),
      ]
    case "Microwave":
      return [
        ...box(x, y, 0, 0.9, 0.65, 0.55),
        face(
          [
            [x + 0.1, y + 0.65, 0.1],
            [x + 0.6, y + 0.65, 0.1],
            [x + 0.6, y + 0.65, 0.45],
            [x + 0.1, y + 0.65, 0.45],
          ],
          "glass"
        ),
      ]
    case "Toaster":
      return [
        ...box(x + 0.15, y + 0.2, 0, 0.6, 0.4, 0.4),
        face(
          [
            [x + 0.25, y + 0.33, 0.4],
            [x + 0.65, y + 0.33, 0.4],
          ],
          "none"
        ),
        face(
          [
            [x + 0.25, y + 0.47, 0.4],
            [x + 0.65, y + 0.47, 0.4],
          ],
          "none"
        ),
      ]
    case "Kettle":
      return [
        ...box(x + 0.2, y + 0.2, 0, 0.45, 0.45, 0.55),
        face(
          [
            [x + 0.65, y + 0.42, 0.45],
            [x + 0.85, y + 0.42, 0.6],
          ],
          "none"
        ),
      ]
    default:
      return box(x + 0.15, y + 0.15, 0, 0.6, 0.6, 0.6)
  }
}

// Free spots on the tile beside and in front of the house, back to front so nearer ones paint over.
const SLOTS: [number, number][] = [
  [0.9, 4.4],
  [4.5, 0.9],
  [2.3, 4.4],
  [4.5, 2.3],
  [3.7, 4.4],
  [4.6, 3.7],
]

/** An isometric REFIT house with its appliances (the first six), drawn like the Hairline EmptyState scenes. */
export function DemoHouseScene({
  labels,
  title,
}: {
  labels: string[]
  title: string
}) {
  const id = useId()
  const shapes = [
    ...TILE,
    ...house(),
    ...SLOTS.slice(0, labels.length)
      .map((slot, i) => ({ slot, label: labels[i]! }))
      .sort((a, b) => a.slot[0] + a.slot[1] - (b.slot[0] + b.slot[1]))
      .flatMap(({ slot, label }) => appliance(label, ...slot)),
  ]
  return (
    <svg
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
      role="img"
      aria-label={title}
      className="h-auto w-full max-w-56"
    >
      <Shapes shapes={shapes} id={id} />
    </svg>
  )
}
