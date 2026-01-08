from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

# Create database directory if it doesn't exist
if not os.path.exists('instance'):
    os.makedirs('instance')

engine = create_engine('sqlite:///instance/snake_game.db', convert_unicode=True)
db_session = scoped_session(sessionmaker(autocommit=False,
                                         autoflush=False,
                                         bind=engine))
Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    import models
    models.Base.metadata.create_all(bind=engine)
