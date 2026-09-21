from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config.settings import settings

# Async SQLAlchemy setup
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db() -> AsyncSession:
    """Dependency for getting async db session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
