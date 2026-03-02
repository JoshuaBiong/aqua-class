-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Add student_completions table
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── student_completions ─────────────────────────────────────────────────────
-- Tracks per-student completion of individual todos
create table if not exists student_completions (
  id          uuid primary key default gen_random_uuid(),
  todo_id     uuid not null references todos(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (todo_id, student_id)
);

alter table student_completions enable row level security;

-- Teachers can view completions for todos in their rooms
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

-- Students can manage their own completions
create policy "Students can manage their own completions"
  on student_completions for all using (auth.uid() = student_id);

-- Add to realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'student_completions') then
    alter publication supabase_realtime add table student_completions;
  end if;
end $$;
