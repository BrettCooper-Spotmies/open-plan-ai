// Bridge re-export — progressively migrate callers to '@/modules/auth'.
export { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute';
export default ProtectedRoute;

import { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute';
