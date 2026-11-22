-- Private originals; the storefront receives short-lived signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy product_image_read on storage.objects for select to anon,authenticated using(bucket_id='product-images' and (public.is_admin() or exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.storage_path=storage.objects.name and p.active)));
create policy admin_image_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_admin());
create policy admin_image_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_admin() and not exists(select 1 from public.product_images i where i.storage_path=storage.objects.name));

-- Restrictive boundaries also protect this bucket from unrelated permissive policies.
create policy product_image_read_boundary on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'product-images' or public.is_admin() or exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.storage_path=storage.objects.name and p.active));
create policy product_image_insert_boundary on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'product-images' or public.is_admin());
create policy product_image_update_boundary on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'product-images') with check(bucket_id<>'product-images');
create policy product_image_delete_boundary on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'product-images' or (public.is_admin() and not exists(select 1 from public.product_images i where i.storage_path=storage.objects.name)));
