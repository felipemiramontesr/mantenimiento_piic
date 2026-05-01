/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 🔱 Archon Diagnostic Tool: AuthDoctor
 * Purpose: Identity & Session Integrity Audit
 */

const runAuthDoctor = (stage: string, data: any): void => {
  console.group(`🔬 [Archon Doctor] Diagnostic: ${stage}`);
  console.log('📦 Data Payload:', data);

  const issues = [];
  if (!data) {
    issues.push('❌ Payload is NULL or UNDEFINED');
  } else {
    if (!data.username) issues.push('❌ MISSING: username');
    if (!data.roleName) issues.push('❌ MISSING: roleName');
    if (!data.roleId && data.roleId !== 0) issues.push('❌ MISSING: roleId');
    if (!data.permissions || data.permissions.length === 0) {
      issues.push('⚠️ WARNING: No permissions found in payload');
    }
  }

  if (issues.length > 0) {
    console.warn('🚨 ISSUES DETECTED:', issues);
  } else {
    console.log('✅ SESSION INTEGRITY: VERIFIED');
  }
  console.groupEnd();
};

export default runAuthDoctor;
