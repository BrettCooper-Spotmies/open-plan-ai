const IMPLICIT_RECOVERY = "openplan_recovery_implicit";

/** Set when we rewrite the URL for implicit `type=recovery` in the hash (see `normalizeRecoveryUrl.ts`). */
export function setImplicitRecoveryFlag(): void {
  try {
    sessionStorage.setItem(IMPLICIT_RECOVERY, "1");
  } catch {
    // ignore
  }
}

export function clearRecoveryFlowFlags(): void {
  try {
    sessionStorage.removeItem(IMPLICIT_RECOVERY);
  } catch {
    // ignore
  }
}

export function hasActiveRecoveryFlowFlag(): boolean {
  try {
    return sessionStorage.getItem(IMPLICIT_RECOVERY) === "1";
  } catch {
    return false;
  }
}
