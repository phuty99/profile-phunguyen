"""add cv fields, experiences, educations

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("phone", sa.String(), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("location", sa.String(), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("website_url", sa.String(), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("linkedin_url", sa.String(), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("github_url", sa.String(), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("skills", sa.Text(), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("interests", sa.Text(), nullable=False, server_default=""))
    op.add_column("profiles", sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "experiences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False, server_default=""),
        sa.Column("company", sa.String(), nullable=False, server_default=""),
        sa.Column("start_date", sa.String(), nullable=False, server_default=""),
        sa.Column("end_date", sa.String(), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "educations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("school", sa.String(), nullable=False, server_default=""),
        sa.Column("degree", sa.String(), nullable=False, server_default=""),
        sa.Column("start_date", sa.String(), nullable=False, server_default=""),
        sa.Column("end_date", sa.String(), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("educations")
    op.drop_table("experiences")
    op.drop_column("profiles", "is_public")
    op.drop_column("profiles", "interests")
    op.drop_column("profiles", "skills")
    op.drop_column("profiles", "github_url")
    op.drop_column("profiles", "linkedin_url")
    op.drop_column("profiles", "website_url")
    op.drop_column("profiles", "location")
    op.drop_column("profiles", "phone")
