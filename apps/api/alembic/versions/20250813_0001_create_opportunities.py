"""create opportunities table

Revision ID: 20250813_0001
Revises: 
Create Date: 2025-08-13 00:01:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250813_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'opportunities',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('symbol', sa.String(), nullable=False, index=True),
        sa.Column('ts', sa.DateTime(), nullable=False, index=True),
        sa.Column('signal_score', sa.Float(), nullable=False),
        sa.Column('price_score', sa.Float(), nullable=False),
        sa.Column('volume_score', sa.Float(), nullable=False),
        sa.Column('volatility_score', sa.Float(), nullable=False),
        sa.Column('entry', sa.Float(), nullable=False),
        sa.Column('stop', sa.Float(), nullable=False),
        sa.Column('target1', sa.Float(), nullable=False),
        sa.Column('target2', sa.Float(), nullable=True),
        sa.Column('pos_size_usd', sa.Float(), nullable=False),
        sa.Column('pos_size_shares', sa.Integer(), nullable=False),
        sa.Column('rr_ratio', sa.Float(), nullable=False),
        sa.Column('p_target', sa.Float(), nullable=False),
        sa.Column('net_expected_r', sa.Float(), nullable=False),
        sa.Column('costs_r', sa.Float(), nullable=False),
        sa.Column('slippage_bps', sa.Float(), nullable=False),
        sa.Column('guardrail_status', sa.String(), nullable=False),
        sa.Column('guardrail_reason', sa.String(), nullable=True),
        sa.Column('features', sa.JSON(), nullable=False),
        sa.Column('version', sa.String(), nullable=False),
    )
    op.create_index('ix_opportunities_symbol_ts', 'opportunities', ['symbol', 'ts'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_opportunities_symbol_ts', table_name='opportunities')
    op.drop_table('opportunities')


