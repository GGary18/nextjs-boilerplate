-- Anonymous publishing, four-digit deletion codes, and school validation.
-- Run this in the Supabase SQL editor before deploying the matching frontend.
create extension if not exists pgcrypto;

-- Contact visibility is now chosen per post, not on the profile.
update public.profiles
set show_wechat = false, show_phone = false, show_email = false;

alter table public.listings alter column owner_id drop not null;
alter table public.housing_posts alter column owner_id drop not null;

alter table public.listings
  add column if not exists delete_code text,
  add column if not exists delete_code_hash text,
  add column if not exists school_email_verified boolean not null default false;
alter table public.housing_posts
  add column if not exists delete_code text,
  add column if not exists delete_code_hash text,
  add column if not exists school_email_verified boolean not null default false;

revoke select (delete_code, delete_code_hash) on public.listings from anon, authenticated;
revoke select (delete_code, delete_code_hash) on public.housing_posts from anon, authenticated;

create or replace function public.prepare_market_post()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare selected_school public.schools%rowtype;
declare profile_school text;
begin
  if new.delete_code is null or new.delete_code !~ '^[0-9]{4}$' then
    raise exception '删除码必须是四位数字';
  end if;
  select * into selected_school from public.schools
  where school_short_name = new.school_short_name and is_active = true limit 1;
  if not found then raise exception '请选择学校列表中的有效学校'; end if;
  new.school_name := selected_school.school_name;
  new.school_short_name := selected_school.school_short_name;
  new.owner_id := auth.uid();
  new.delete_code_hash := crypt(new.delete_code, gen_salt('bf'));
  new.delete_code := null;
  new.school_email_verified := false;
  if auth.uid() is not null then
    select school_short_name into profile_school from public.profiles where id = auth.uid();
    new.school_email_verified := coalesce(profile_school = selected_school.school_short_name, false);
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_listing_post on public.listings;
create trigger prepare_listing_post before insert on public.listings
for each row execute function public.prepare_market_post();
drop trigger if exists prepare_housing_post on public.housing_posts;
create trigger prepare_housing_post before insert on public.housing_posts
for each row execute function public.prepare_market_post();

create or replace function public.delete_market_post(post_table text, post_id uuid, supplied_code text)
returns text[] language plpgsql security definer set search_path = public, extensions as $$
declare stored_hash text; stored_owner uuid; stored_images text[];
begin
  if post_table = 'listings' then
    select delete_code_hash, owner_id, coalesce(image_urls, '{}') into stored_hash, stored_owner, stored_images
    from public.listings where id = post_id;
  elsif post_table = 'housing_posts' then
    select delete_code_hash, owner_id, coalesce(image_urls, '{}') into stored_hash, stored_owner, stored_images
    from public.housing_posts where id = post_id;
  else raise exception '无效的帖子类型'; end if;
  if stored_hash is null then raise exception '帖子不存在'; end if;
  if not ((auth.uid() is not null and auth.uid() = stored_owner)
    or (supplied_code ~ '^[0-9]{4}$' and crypt(supplied_code, stored_hash) = stored_hash)) then
    raise exception '删除码不正确';
  end if;
  if post_table = 'listings' then delete from public.listings where id = post_id;
  else delete from public.housing_posts where id = post_id; end if;
  return stored_images;
end;
$$;
grant execute on function public.delete_market_post(text, uuid, text) to anon, authenticated;

drop policy if exists "Anyone can publish listings" on public.listings;
create policy "Anyone can publish listings" on public.listings for insert to anon, authenticated with check (true);
drop policy if exists "Anyone can publish housing posts" on public.housing_posts;
create policy "Anyone can publish housing posts" on public.housing_posts for insert to anon, authenticated with check (true);

drop policy if exists "Post image uploads" on storage.objects;
create policy "Post image uploads" on storage.objects for insert to anon, authenticated
with check (bucket_id in ('listing-images', 'housing-images') and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$');
