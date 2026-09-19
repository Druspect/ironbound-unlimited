export type CameraMode = "auto" | "close" | "standard" | "wide";

export type TrainSceneGeometry = {
  cameraScale: number;
  passengerRenderedWidth: number;
  platformRenderedWidth: number;
  passengerLeft: number;
  passengerRight: number;
  platformUsableLeft: number;
  platformUsableRight: number;
};

export const PASSENGER_ANCHOR_VIEWPORT_RATIO = .4;
export const PLATFORM_USABLE_WIDTH_RATIO = .94;

const CAMERA_MODE_SCALE: Readonly<Record<CameraMode, number>> = Object.freeze({
  auto: 1.04,
  close: 1.16,
  standard: 1,
  wide: .82,
});

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * Fits both ends of the full train around the passenger-platform anchor. The
 * requested camera mode may widen the view, but can never crop the consist.
 */
export function calculateTrainSceneGeometry(
  viewportWidth: number,
  passengerWorldWidth: number,
  trainWorldWidth: number,
  cameraMode: CameraMode = "auto",
): TrainSceneGeometry {
  const viewport = Math.max(320, viewportWidth);
  const passengerWidth = Math.max(1, passengerWorldWidth);
  const totalWidth = Math.max(passengerWidth, trainWorldWidth);
  const trainAnchor = passengerWidth / 2;
  const viewportAnchor = viewport * PASSENGER_ANCHOR_VIEWPORT_RATIO;
  const edgeMargin = clamp(viewport * .025, 12, 32);
  const leftRoom = Math.max(1, viewportAnchor - edgeMargin);
  const rightRoom = Math.max(1, viewport - viewportAnchor - edgeMargin);
  const fitScale = Math.min(
    leftRoom / trainAnchor,
    rightRoom / Math.max(1, totalWidth - trainAnchor),
    1.04,
  );
  const cameraScale = clamp(Math.min(CAMERA_MODE_SCALE[cameraMode], fitScale), .16, 1.04);
  const passengerRenderedWidth = passengerWidth * cameraScale;
  const desiredPlatformWidth = Math.max(
    Math.min(680, viewport * .82),
    (passengerRenderedWidth + clamp(viewport * .04, 32, 72)) / PLATFORM_USABLE_WIDTH_RATIO,
  );
  // The platform shares the 40% passenger anchor, so its fully visible width
  // is limited by the nearer viewport edge. Compress decorative end margin
  // before allowing the station art to clip off-screen.
  const maximumCenteredPlatformWidth = Math.max(
    passengerRenderedWidth,
    2 * Math.min(viewportAnchor - 2, viewport - viewportAnchor - 2),
  );
  const platformRenderedWidth = Math.min(desiredPlatformWidth, maximumCenteredPlatformWidth);
  const passengerLeft = viewportAnchor - passengerRenderedWidth / 2;
  const passengerRight = viewportAnchor + passengerRenderedWidth / 2;
  // Keep at least 10 rendered pixels of usable platform beyond each end of
  // the passenger consist whenever the viewport permits it.
  const platformUsableWidth = Math.min(
    platformRenderedWidth,
    Math.max(platformRenderedWidth * PLATFORM_USABLE_WIDTH_RATIO, passengerRenderedWidth + 20),
  );

  return {
    cameraScale,
    passengerRenderedWidth,
    platformRenderedWidth,
    passengerLeft,
    passengerRight,
    platformUsableLeft: viewportAnchor - platformUsableWidth / 2,
    platformUsableRight: viewportAnchor + platformUsableWidth / 2,
  };
}
