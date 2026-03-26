declare module '@/src/lib/supabase' {
  import type { SupabaseClient } from '@supabase/supabase-js';

  export const supabase: SupabaseClient;
  export default supabase;
}

declare module '@/utils/supabase' {
  import type { SupabaseClient } from '@supabase/supabase-js';

  export const supabase: SupabaseClient;
  export default supabase;
}
