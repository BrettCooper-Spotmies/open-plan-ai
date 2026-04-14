alter table if exists public.checklists
add column if not exists show_in_board_view boolean not null default false;
