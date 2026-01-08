from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import relationship, scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import werkzeug.security

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(128))
    created_at = Column(DateTime, default=datetime.now)
    last_login = Column(DateTime)
    
    def set_password(self, password):
        self.password_hash = werkzeug.security.generate_password_hash(password)
        
    def check_password(self, password):
        return werkzeug.security.check_password_hash(self.password_hash, password)

class GameSession(Base):
    __tablename__ = 'game_sessions'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    session_id = Column(String(36), unique=True)
    start_time = Column(DateTime, default=datetime.now)
    end_time = Column(DateTime)
    score = Column(Integer, default=0)
    duration = Column(Integer, default=0) # in seconds
    
    user = relationship('User', backref='sessions')

class GameScore(Base):
    __tablename__ = 'game_scores'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    score = Column(Integer, nullable=False)
    achieved_at = Column(DateTime, default=datetime.now)
    
    user = relationship('User', backref='scores')

class Leaderboard(Base):
    __tablename__ = 'leaderboard'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    score = Column(Integer, nullable=False)
    updated_at = Column(DateTime, default=datetime.now)
    
    user = relationship('User', backref='leaderboard_entry')
