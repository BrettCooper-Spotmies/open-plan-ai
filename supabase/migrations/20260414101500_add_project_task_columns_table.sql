-- Persist custom Kanban bucket configuration per project
create table if not exists public.project_task_columns (
  project_id uuid not null references public.projects(id) on delete cascade,
  column_id text not null,
  status text not null,
  label text not null,
  color text not null default 'bg-status-todo',
  position integer not null default 0,
  is_special boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, column_id)
);

create index if not exists idx_project_task_columns_project_position
  on public.project_task_columns(project_id, position);

alter table public.project_task_columns enable row level security;

drop policy if exists "Users can view task columns in accessible projects" on public.project_task_columns;
create policy "Users can view task columns in accessible projects"
  on public.project_task_columns for select
  to authenticated
  using (public.has_project_access(project_id));

drop policy if exists "Users can create task columns in accessible projects" on public.project_task_columns;
create policy "Users can create task columns in accessible projects"
  on public.project_task_columns for insert
  to authenticated
  with check (public.has_project_access(project_id));

drop policy if exists "Users can update task columns in accessible projects" on public.project_task_columns;
create policy "Users can update task columns in accessible projects"
  on public.project_task_columns for update
  to authenticated
  using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));

drop policy if exists "Users can delete task columns in accessible projects" on public.project_task_columns;
create policy "Users can delete task columns in accessible projects"
  on public.project_task_columns for delete
  to authenticated
  using (public.has_project_access(project_id));

drop trigger if exists update_project_task_columns_updated_at on public.project_task_columns;
create trigger update_project_task_columns_updated_at
  before update on public.project_task_columns
  for each row
  execute function public.update_updated_at_column();
