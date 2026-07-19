create table if not exists inmu_game_users (
  id bigserial primary key,
  portal_user_id text not null unique,
  username varchar(80) not null,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inmu_game_results (
  id bigserial primary key,
  game_user_id bigint not null references inmu_game_users(id) on delete cascade,
  mode varchar(24) not null,
  finish_position smallint not null check (finish_position between 1 and 4),
  score integer not null default 0,
  played_at timestamptz not null default now()
);

create index if not exists inmu_game_results_user_played_idx
  on inmu_game_results (game_user_id, played_at desc);
