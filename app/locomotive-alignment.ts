import registration from "./locomotive-registration.json" with { type: "json" };

export type AxleKind = "driver" | "leading" | "trailing" | "tender";

export type AxleAlignmentPoint = {
  id: string;
  kind: AxleKind;
  x: number;
  bottom: number;
  size: number;
  phase: number;
  rodGroup?: number;
};

export type RodAlignmentPoint = {
  id: string;
  start: number;
  end: number;
  bottom: number;
  phase: number;
};

export type LocomotiveAlignmentProfile = {
  axles: readonly AxleAlignmentPoint[];
  rods: readonly RodAlignmentPoint[];
};

const rod = (id: string, start: number, end: number, bottom: number, phase: number): RodAlignmentPoint =>
  ({ id, start, end, bottom, phase });

// All engines consume the builder's exact registered axle geometry.
// There is no second hand-maintained table that can drift from the artwork.
export const LOCOMOTIVE_ALIGNMENT_POINTS: Readonly<Record<string, LocomotiveAlignmentProfile>> = Object.freeze({
  ...Object.fromEntries(Object.entries(registration.profiles).map(([id, profile]) => [id, {
    axles: profile.axles.map((point) => ({ ...point, kind: point.kind as AxleKind, rodGroup: point.rodGroup ?? undefined })),
    rods: profile.rod_groups.map((point, index) => rod(
      `engine-${index + 1}`, point.start, point.end,
      profile.axles.find((a) => a.kind === "driver" && a.rodGroup === index)!.cy,
      point.phase,
    )),
  }])),
});
