DELETE FROM public.sponsors
 WHERE TRUE;
--> statement-breakpoint

ALTER TABLE IF EXISTS public.sponsors
  ADD COLUMN IF NOT EXISTS order_id text;
--> statement-breakpoint
ALTER TABLE IF EXISTS public.sponsors
  ALTER COLUMN order_id SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsors_order_id
  ON public.sponsors (order_id);
