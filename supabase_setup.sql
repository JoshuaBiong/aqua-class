-- ═══════════════════════════════════════════════════════════════════════════════
-- AquaClass — Supabase Database Setup
-- Run this once in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 0. Reset Policies ──────────────────────────────────────────────────────────
-- Drop all existing policies to ensure no old recursive policies remain
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ─── 1. Profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null check (role in ('teacher', 'student')),
  avatar     text default '🐠',
  email      text,
  created_at timestamptz default now()
);

-- Ensure the email column exists in case the table was created previously without it
alter table profiles add column if not exists email text;

alter table profiles enable row level security;

create policy "Users can read any profile"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- ─── 2. Rooms ─────────────────────────────────────────────────────────────────
create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  description text default '',
  teacher_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

alter table rooms enable row level security;

create policy "Teachers can manage their own rooms"
  on rooms for all using (auth.uid() = teacher_id);

-- FIXED: Replaced recursive policies with a simple authenticated check
create policy "Anyone can read rooms"
  on rooms for select using (auth.role() = 'authenticated');

-- ─── 3. Room Members ─────────────────────────────────────────────────────────
create table if not exists room_members (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (room_id, student_id)
);

alter table room_members enable row level security;

create policy "Teachers can manage members of their rooms"
  on room_members for all using (
    exists (
      select 1 from rooms
      where rooms.id = room_members.room_id
        and rooms.teacher_id = auth.uid()
    )
  );

create policy "Anyone can read room members"
  on room_members for select using (auth.role() = 'authenticated');

create policy "Students can join rooms"
  on room_members for insert with check (auth.uid() = student_id);

-- ─── 4. Assignments ──────────────────────────────────────────────────────────
create table if not exists assignments (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  name        text not null,
  color_index int default 0,
  due_date    date,
  created_at  timestamptz default now()
);

alter table assignments enable row level security;

create policy "Teachers can manage assignments in their rooms"
  on assignments for all using (
    exists (
      select 1 from rooms
      where rooms.id = assignments.room_id
        and rooms.teacher_id = auth.uid()
    )
  );

create policy "Students can view assignments in their rooms"
  on assignments for select using (
    exists (
      select 1 from room_members
      where room_members.room_id = assignments.room_id
        and room_members.student_id = auth.uid()
    )
  );

-- ─── 5. Todos ─────────────────────────────────────────────────────────────────
create table if not exists todos (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  title         text not null,
  notes         text default '',
  done          boolean default false,
  created_at    timestamptz default now()
);

alter table todos enable row level security;

create policy "Teachers can manage todos in their assignments"
  on todos for all using (
    exists (
      select 1 from assignments
      join rooms on rooms.id = assignments.room_id
      where assignments.id = todos.assignment_id
        and rooms.teacher_id = auth.uid()
    )
  );

create policy "Students can view todos in their rooms"
  on todos for select using (
    exists (
      select 1 from assignments
      join room_members on room_members.room_id = assignments.room_id
      where assignments.id = todos.assignment_id
        and room_members.student_id = auth.uid()
    )
  );

create policy "Students can update todos (mark done)"
  on todos for update using (
    exists (
      select 1 from assignments
      join room_members on room_members.room_id = assignments.room_id
      where assignments.id = todos.assignment_id
        and room_members.student_id = auth.uid()
    )
  );

-- ─── 6. Submissions ──────────────────────────────────────────────────────────
create table if not exists submissions (
  id           uuid primary key default gen_random_uuid(),
  todo_id      uuid not null references todos(id) on delete cascade,
  student_id   uuid not null references profiles(id) on delete cascade,
  file_name    text not null,
  file_type    text,
  file_size    bigint,
  storage_path text not null,
  created_at   timestamptz default now()
);

alter table submissions enable row level security;

create policy "Teachers can view submissions in their rooms"
  on submissions for select using (
    exists (
      select 1 from todos
      join assignments on assignments.id = todos.assignment_id
      join rooms on rooms.id = assignments.room_id
      where todos.id = submissions.todo_id
        and rooms.teacher_id = auth.uid()
    )
  );

create policy "Students can manage their own submissions"
  on submissions for all using (auth.uid() = student_id);

-- ─── 7. Student Completions ──────────────────────────────────────────────────
-- Per-student completion tracking for todos
create table if not exists student_completions (
  id          uuid primary key default gen_random_uuid(),
  todo_id     uuid not null references todos(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (todo_id, student_id)
);

alter table student_completions enable row level security;

create policy "Teachers can view student completions"
  on student_completions for select using (
    exists (
      select 1 from todos
      join assignments on assignments.id = todos.assignment_id
      join rooms on rooms.id = assignments.room_id
      where todos.id = student_completions.todo_id
        and rooms.teacher_id = auth.uid()
    )
  );

create policy "Students can manage their own completions"
  on student_completions for all using (auth.uid() = student_id);

-- ─── 8. Storage Bucket ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

drop policy if exists "Students can upload to submissions bucket" on storage.objects;
create policy "Students can upload to submissions bucket"
  on storage.objects for insert
  with check (bucket_id = 'submissions' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read submissions" on storage.objects;
create policy "Authenticated users can read submissions"
  on storage.objects for select
  using (bucket_id = 'submissions' and auth.role() = 'authenticated');

drop policy if exists "Users can delete their own uploads" on storage.objects;
create policy "Users can delete their own uploads"
  on storage.objects for delete
  using (bucket_id = 'submissions' and auth.role() = 'authenticated');

-- ─── 9. Realtime ──────────────────────────────────────────────────────────────
do $$ 
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'rooms') then
    alter publication supabase_realtime add table rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'room_members') then
    alter publication supabase_realtime add table room_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'assignments') then
    alter publication supabase_realtime add table assignments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'todos') then
    alter publication supabase_realtime add table todos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'submissions') then
    alter publication supabase_realtime add table submissions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'student_completions') then
    alter publication supabase_realtime add table student_completions;
  end if;
end $$;
