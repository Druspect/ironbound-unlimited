export const RELEASE_INFO = Object.freeze({
  stage: "G",
  label: "Production Release Candidate",
  saveSchema: 4,
  buildId: "stage-g-rc1",
});

export function releaseDisplayLabel() {
  return `Stage ${RELEASE_INFO.stage} • ${RELEASE_INFO.label}`;
}
