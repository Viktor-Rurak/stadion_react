// Підключення до Supabase — нашої бази даних у хмарі.
// Цей об'єкт `supabase` імпортують усі файли, яким потрібна база.
import { createClient } from '@supabase/supabase-js';

// Адреса проєкту та публічний ключ.
// Цей ключ БЕЗПЕЧНО тримати в коді сайту: він дозволяє лише те,
// що дозволяють правила безпеки (RLS) у самій базі.
const SUPABASE_URL = 'https://fudrgpsrbfeqwszsdaxf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uNNwiihkct30ojFNrfOjbw_KAtdhoYL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
