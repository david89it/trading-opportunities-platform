"""add user_id column and RLS policies for opportunities
Revision ID: 811654c0aa77
Revises: 20250813_0001
Create Date: 2025-08-25 17:44:28.729164

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '811654c0aa77'
down_revision = '20250813_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Add user_id column as uuid, nullable initially for backfill
    op.add_column('opportunities', sa.Column('user_id', sa.dialects.postgresql.UUID(), nullable=True))
    # Index for user scoping
    op.create_index('ix_opportunities_user_id', 'opportunities', ['user_id'], unique=False)

    # 2) Enable RLS and create policies (Postgres-level SQL)
    # Note: In Supabase, auth.uid() works within policies
    op.execute("ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;")

    # Avoid duplicates if re-run
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'select_own'
            ) THEN
                CREATE POLICY "select_own" ON public.opportunities
                FOR SELECT USING (auth.uid() = user_id);
            END IF;
        END$$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'insert_own'
            ) THEN
                CREATE POLICY "insert_own" ON public.opportunities
                FOR INSERT WITH CHECK (auth.uid() = user_id);
            END IF;
        END$$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'update_own'
            ) THEN
                CREATE POLICY "update_own" ON public.opportunities
                FOR UPDATE USING (auth.uid() = user_id);
            END IF;
        END$$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'delete_own'
            ) THEN
                CREATE POLICY "delete_own" ON public.opportunities
                FOR DELETE USING (auth.uid() = user_id);
            END IF;
        END$$;
        """
    )


def downgrade() -> None:
    # drop policies (if exist)
    op.execute("DROP POLICY IF EXISTS delete_own ON public.opportunities;")
    op.execute("DROP POLICY IF EXISTS update_own ON public.opportunities;")
    op.execute("DROP POLICY IF EXISTS insert_own ON public.opportunities;")
    op.execute("DROP POLICY IF EXISTS select_own ON public.opportunities;")

    # disable RLS (optional)
    op.execute("ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;")

    # drop index and column
    op.drop_index('ix_opportunities_user_id', table_name='opportunities')
    op.drop_column('opportunities', 'user_id')


