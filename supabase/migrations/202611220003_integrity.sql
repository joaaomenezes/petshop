-- Preserve a category tree without cycles, even for direct Data API writes.
create function public.prevent_category_cycle() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin if new.parent_id is not null and exists(with recursive ancestors as(select id,parent_id from public.categories where id=new.parent_id union select c.id,c.parent_id from public.categories c join ancestors a on c.id=a.parent_id) select 1 from ancestors where id=new.id) then raise exception 'Uma categoria não pode ser descendente de si mesma';end if;return new;end$$;
revoke all on function public.prevent_category_cycle() from public,anon,authenticated;
create trigger prevent_category_cycle before insert or update of parent_id on public.categories for each row execute function public.prevent_category_cycle();
alter table public.product_images add constraint images_unique_order unique(product_id,sort_order);
