-- National freight: no sales or paid labels are enabled. Apply after migration 004.
begin;
alter table public.product_variants add column shipping_weight_grams integer check (shipping_weight_grams>0 and shipping_weight_grams<=1000000);
alter table public.product_variants add column package_width_cm numeric(8,2) check (package_width_cm>0 and package_width_cm<=1000);
alter table public.product_variants add column package_height_cm numeric(8,2) check (package_height_cm>0 and package_height_cm<=1000);
alter table public.product_variants add column package_length_cm numeric(8,2) check (package_length_cm>0 and package_length_cm<=1000);
grant select(shipping_weight_grams,package_width_cm,package_height_cm,package_length_cm) on public.product_variants to authenticated;
alter table public.orders add column shipping_details jsonb;
alter function public.save_product(jsonb) rename to save_product_before_shipping;
revoke all on function public.save_product_before_shipping(jsonb) from public,anon,authenticated;
create function public.save_product(payload jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$declare pid uuid;v jsonb;begin
if not public.is_admin() then raise exception 'Administrador necessário' using errcode='42501';end if;
pid=public.save_product_before_shipping(payload);
for v in select * from jsonb_array_elements(payload->'variants') loop
update public.product_variants set shipping_weight_grams=case when v ? 'shipping_weight_grams' then (v->>'shipping_weight_grams')::integer else shipping_weight_grams end,package_width_cm=case when v ? 'package_width_cm' then (v->>'package_width_cm')::numeric else package_width_cm end,package_height_cm=case when v ? 'package_height_cm' then (v->>'package_height_cm')::numeric else package_height_cm end,package_length_cm=case when v ? 'package_length_cm' then (v->>'package_length_cm')::numeric else package_length_cm end where id=(v->>'id')::uuid and product_id=pid;
end loop;return pid;end$$;
revoke all on function public.save_product(jsonb) from public,anon;
grant execute on function public.save_product(jsonb) to authenticated;
create function public.checkout_shipping_cart(p_lines jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare line jsonb;v record;items jsonb='[]';subtotal bigint=0;qty integer;begin
if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 50 then raise exception 'Carrinho inválido';end if;
if (select count(distinct x->>'variant_id') from jsonb_array_elements(p_lines) x)<>jsonb_array_length(p_lines) then raise exception 'Variantes duplicadas';end if;
for line in select * from jsonb_array_elements(p_lines) loop
if coalesce(line->>'quantity','') !~ '^[0-9]{1,4}$' then raise exception 'Quantidade inválida';end if;qty=(line->>'quantity')::integer;if qty<1 then raise exception 'Quantidade inválida';end if;
select pv.*,p.name as product_name,b.name as brand_name into v from public.product_variants pv join public.products p on p.id=pv.product_id join public.brands b on b.id=p.brand_id join public.categories c on c.id=p.category_id where pv.id=(line->>'variant_id')::uuid and pv.active and p.active and b.active and c.active;
if not found or v.stock_quantity-v.reserved_quantity<qty then raise exception 'Produto indisponível ou estoque insuficiente';end if;
if v.shipping_weight_grams is null or v.package_width_cm is null or v.package_height_cm is null or v.package_length_cm is null then raise exception 'Produto sem peso ou dimensões de envio cadastrados';end if;
subtotal=subtotal+v.price_cents::bigint*qty;items=items||jsonb_build_array(jsonb_build_object('variant_id',v.id,'product_name',v.product_name,'brand_name',v.brand_name,'sku',v.sku,'label',v.label,'unit_price_cents',v.price_cents,'quantity',qty,'shipping_weight_grams',v.shipping_weight_grams,'package_width_cm',v.package_width_cm,'package_height_cm',v.package_height_cm,'package_length_cm',v.package_length_cm));
end loop;
if subtotal<1 or subtotal>2147483647 then raise exception 'Valor do carrinho inválido';end if;
return jsonb_build_object('items',items,'subtotal_cents',subtotal,'shipping_cents',0,'total_cents',subtotal,'delivery_estimate','','currency','BRL');end$$;

revoke all on function public.checkout_shipping_cart(jsonb) from public;
grant execute on function public.checkout_shipping_cart(jsonb) to anon,authenticated,service_role;
create function public.checkout_create_national(p_session_hash text,p_idempotency uuid,p_request_hash text,p_customer jsonb,p_address jsonb,p_lines jsonb,p_expected_total bigint,p_shipping jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare existing public.orders%rowtype;q jsonb;oid uuid;item jsonb;begin
if not public.checkout_service() then raise exception 'Acesso negado' using errcode='42501';end if;
perform pg_advisory_xact_lock(hashtext(p_session_hash||p_idempotency::text));
select * into existing from public.orders where session_hash=p_session_hash and idempotency_key=p_idempotency;
if found then if existing.request_hash<>p_request_hash then raise exception 'Requisição diferente para o mesmo identificador';end if;return jsonb_build_object('id',existing.id,'expires_at',existing.expires_at,'payment_status',existing.payment_status);end if;
if (select count(*) from public.orders where session_hash=p_session_hash and created_at>now()-interval '1 hour')>=5 then raise exception 'Limite de tentativas. Aguarde para tentar novamente.';end if;
perform 1 from public.product_variants where id in(select (x->>'variant_id')::uuid from jsonb_array_elements(p_lines) x) order by id for update;
q=public.checkout_shipping_cart(p_lines);
if p_shipping->'items' is distinct from q->'items' then raise exception 'Valores atualizados. Revise o pedido novamente.';end if;
if p_shipping is null or p_shipping->>'destination' is distinct from p_address->>'postal_code' or p_shipping->>'expires_at' is null or (p_shipping->>'expires_at')::timestamptz<=now() or p_shipping->>'provider' is distinct from 'melhor_envio' or coalesce(p_shipping->>'price_cents','') !~ '^[0-9]{1,9}$' or length(coalesce(p_shipping->>'service_id',''))=0 then raise exception 'Cotação de frete inválida ou expirada';end if;
q=q||jsonb_build_object('shipping_cents',(p_shipping->>'price_cents')::integer,'total_cents',(q->>'subtotal_cents')::bigint+(p_shipping->>'price_cents')::integer,'delivery_estimate',p_shipping->>'delivery_estimate');
if p_expected_total is null or (q->>'total_cents')::bigint<>p_expected_total then raise exception 'Valores atualizados. Revise o pedido novamente.';end if;
insert into public.orders(shipping_details,session_hash,idempotency_key,request_hash,customer_name,customer_email,customer_phone,address,delivery_estimate,subtotal_cents,shipping_cents,total_cents) values(p_shipping-'items'-'session_hash'-'address_hash',p_session_hash,p_idempotency,p_request_hash,p_customer->>'name',lower(p_customer->>'email'),p_customer->>'phone',p_address,q->>'delivery_estimate',(q->>'subtotal_cents')::bigint,(q->>'shipping_cents')::integer,(q->>'total_cents')::bigint) returning id into oid;
for item in select * from jsonb_array_elements(q->'items') loop
insert into public.order_items(order_id,variant_id,product_name,brand_name,sku,label,unit_price_cents,quantity) values(oid,(item->>'variant_id')::uuid,item->>'product_name',item->>'brand_name',item->>'sku',item->>'label',(item->>'unit_price_cents')::integer,(item->>'quantity')::integer);
update public.product_variants set reserved_quantity=reserved_quantity+(item->>'quantity')::integer where id=(item->>'variant_id')::uuid;
end loop;return jsonb_build_object('id',oid,'expires_at',(select expires_at from public.orders where id=oid),'payment_status','pending');end$$;
revoke all on function public.checkout_create_national(text,uuid,text,jsonb,jsonb,jsonb,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.checkout_create_national(text,uuid,text,jsonb,jsonb,jsonb,bigint,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
