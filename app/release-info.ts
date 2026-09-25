export const RELEASE_INFO = Object.freeze({
  stage: "G",
  label: "Production Release",
  saveSchema: 4,
  version: "1.0.0",
  buildId: "stage-g-release",
});

export function releaseDisplayLabel() {
  return `Stage ${RELEASE_INFO.stage} • ${RELEASE_INFO.label}`;
}
