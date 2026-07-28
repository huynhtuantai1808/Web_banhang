from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import tất cả model tại đây để Alembic autogenerate nhận diện đầy đủ
from app.models import customer, employee, product, promotion, order, cart, installment, settings, shipment  # noqa
