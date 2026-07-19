create table if not exists inmu_challenge_progress (
  game_user_id bigint primary key references inmu_game_users(id) on delete cascade,
  highest_cleared_level integer not null default 0 check (highest_cleared_level between 0 and 100),
  cleared_levels integer[] not null default '{}',
  updated_at timestamptz not null default now()
);
