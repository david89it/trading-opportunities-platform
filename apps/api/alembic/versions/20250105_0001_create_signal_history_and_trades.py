"""create signal_history and trades tables

Revision ID: 20250105_0001
Revises: 811654c0aa77
Create Date: 2025-01-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250105_0001'
down_revision = '811654c0aa77'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create signal_history table
    op.create_table(
        'signal_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('symbol', sa.String(10), nullable=False),
        sa.Column('signal_score', sa.Numeric(10, 2), nullable=False),
        sa.Column('p_target', sa.Numeric(10, 4), nullable=False),
        
        # Signal details at time of generation
        sa.Column('entry_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('stop_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('target_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('rr_ratio', sa.Numeric(10, 2), nullable=True),
        
        # Outcome tracking
        sa.Column('outcome', sa.String(20), nullable=True),  # 'target_hit', 'stopped_out', 'expired', 'still_open'
        sa.Column('entry_time', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('exit_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('exit_time', sa.TIMESTAMP(timezone=True), nullable=True),
        
        # Performance metrics
        sa.Column('mfe', sa.Numeric(10, 4), nullable=True),  # Maximum Favorable Excursion (percentage)
        sa.Column('mae', sa.Numeric(10, 4), nullable=True),  # Maximum Adverse Excursion (percentage)
        sa.Column('actual_r', sa.Numeric(10, 4), nullable=True),  # Actual R achieved
        sa.Column('days_held', sa.Integer, nullable=True),
        
        # Metadata
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('version', sa.String(10), nullable=False, server_default='1.0'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    
    # Indexes for signal_history
    op.create_index('ix_signal_history_user_id', 'signal_history', ['user_id'])
    op.create_index('ix_signal_history_symbol', 'signal_history', ['symbol'])
    op.create_index('ix_signal_history_outcome', 'signal_history', ['outcome'])
    op.create_index('ix_signal_history_created_at', 'signal_history', ['created_at'])
    
    # Enable RLS
    op.execute("ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;")
    
    # RLS policies for signal_history
    op.execute("""
        CREATE POLICY "Users manage own signal_history" ON signal_history
        FOR ALL USING (auth.uid() = user_id);
    """)
    
    # Create trades table
    op.create_table(
        'trades',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False),
        
        # Trade identification
        sa.Column('symbol', sa.String(10), nullable=False),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('side', sa.String(10), nullable=False, server_default='long'),  # 'long' or 'short'
        
        # Entry details
        sa.Column('entry_time', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('entry_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('position_size_shares', sa.Integer, nullable=False),
        sa.Column('stop_loss', sa.Numeric(10, 2), nullable=False),
        sa.Column('target_1', sa.Numeric(10, 2), nullable=False),
        sa.Column('target_2', sa.Numeric(10, 2), nullable=True),
        
        # Exit details
        sa.Column('exit_time', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('exit_price', sa.Numeric(10, 2), nullable=True),
        sa.Column('exit_reason', sa.String(50), nullable=True),  # 'target_hit', 'stopped_out', 'manual_close', 'trailing_stop'
        
        # Performance
        sa.Column('pnl_usd', sa.Numeric(10, 2), nullable=True),
        sa.Column('pnl_r', sa.Numeric(10, 4), nullable=True),  # P&L in R units
        sa.Column('fees_usd', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('slippage_bps', sa.Numeric(10, 2), nullable=True),
        
        # Metadata
        sa.Column('tags', postgresql.ARRAY(sa.String(50)), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('screenshots', postgresql.ARRAY(sa.String(500)), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    
    # Indexes for trades
    op.create_index('ix_trades_user_id', 'trades', ['user_id'])
    op.create_index('ix_trades_symbol', 'trades', ['symbol'])
    op.create_index('ix_trades_entry_time', 'trades', ['entry_time'], postgresql_ops={'entry_time': 'DESC'})
    op.create_index('ix_trades_exit_time', 'trades', ['exit_time'], postgresql_ops={'exit_time': 'DESC'})
    
    # Enable RLS
    op.execute("ALTER TABLE trades ENABLE ROW LEVEL SECURITY;")
    
    # RLS policies for trades
    op.execute("""
        CREATE POLICY "Users manage own trades" ON trades
        FOR ALL USING (auth.uid() = user_id);
    """)
    
    # Create updated_at trigger function if it doesn't exist
    op.execute("""
        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Add updated_at triggers
    op.execute("""
        CREATE TRIGGER set_signal_history_updated_at
        BEFORE UPDATE ON signal_history
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    """)
    
    op.execute("""
        CREATE TRIGGER set_trades_updated_at
        BEFORE UPDATE ON trades
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    """)


def downgrade() -> None:
    # Drop triggers
    op.execute("DROP TRIGGER IF EXISTS set_trades_updated_at ON trades;")
    op.execute("DROP TRIGGER IF EXISTS set_signal_history_updated_at ON signal_history;")
    
    # Drop tables (RLS policies drop automatically)
    op.drop_table('trades')
    op.drop_table('signal_history')
    
    # Optionally drop the trigger function if no other tables use it
    # op.execute("DROP FUNCTION IF EXISTS trigger_set_timestamp();")
