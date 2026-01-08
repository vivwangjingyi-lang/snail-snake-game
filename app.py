import os
import random
import uuid
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from database import db_session, init_db
from models import User, GameSession, GameScore, Leaderboard

app = Flask(__name__)
app.secret_key = os.urandom(24)

# 初始化数据库
init_db()

@app.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()

# 路由
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('game'))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    if 'user_id' in session:
        return redirect(url_for('game'))
    return render_template('login.html')

@app.route('/game')
def game():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # 生成新的游戏会话ID
    session_id = str(uuid.uuid4())
    return render_template('game.html', session_id=session_id)

# API 接口
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password') # 实际应用应使用哈希密码
    
    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'})
    
    user = User.query.filter(User.username == username).first()
    
    if user and user.check_password(password):
        session['user_id'] = user.id
        session['username'] = user.username
        
        # update last login
        user.last_login = datetime.now()
        db_session.commit()
        
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': '用户名或密码错误'})

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'})
    
    if User.query.filter(User.username == username).first():
        return jsonify({'success': False, 'message': '用户名已存在'})
    
    new_user = User(username=username)
    new_user.set_password(password)
    db_session.add(new_user)
    db_session.commit()
    
    return jsonify({'success': True})

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/game/start', methods=['POST'])
def game_start():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    data = request.json
    session_id = data.get('session_id')
    
    # 记录游戏开始
    new_game = GameSession(
        session_id=session_id,
        user_id=session['user_id']
    )
    db_session.add(new_game)
    db_session.commit()
    
    return jsonify({'success': True})

@app.route('/api/game/end', methods=['POST'])
def game_end():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': '未登录'}), 401
    
    data = request.json
    session_id = data.get('session_id')
    score = data.get('score', 0)
    duration = data.get('duration', 0)
    
    game_session = GameSession.query.filter(GameSession.session_id == session_id).first()
    if game_session:
        game_session.score = score
        game_session.duration = duration
        game_session.end_time = datetime.now()
        db_session.commit()
    
    # 检查并更新排行榜
    # 这里简化处理，每次游戏结束都检查是否是高分
    user = User.query.get(session['user_id'])
    
    # 获取用户最高分
    best_score = db_session.query(GameSession).filter(
        GameSession.user_id == user.id
    ).order_by(GameSession.score.desc()).first()
    
    high_score = best_score.score if best_score else 0
    if score > high_score: 
        high_score = score
        
    # 更新或创建排行榜条目
    leaderboard_entry = Leaderboard.query.filter(Leaderboard.user_id == user.id).first()
    if leaderboard_entry:
        if score > leaderboard_entry.score:
            leaderboard_entry.score = score
            leaderboard_entry.updated_at = datetime.now()
    else:
        leaderboard_entry = Leaderboard(user_id=user.id, score=score)
        db_session.add(leaderboard_entry)
        
    db_session.commit()
    
    # 计算击败了多少玩家
    total_players = Leaderboard.query.count()
    if total_players > 1:
        rank = Leaderboard.query.filter(Leaderboard.score > score).count() + 1
        beat_percentage = int(((total_players - rank) / total_players) * 100)
    else:
        beat_percentage = 100
        
    return jsonify({
        'success': True, 
        'beat_percentage': beat_percentage,
        'new_record': score == high_score and score > 0
    })

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    # 获取前10名
    leaders = db_session.query(Leaderboard).join(User).order_by(
        Leaderboard.score.desc()
    ).limit(10).all()
    
    result = []
    for idx, entry in enumerate(leaders):
        result.append({
            'rank': idx + 1,
            'username': entry.user.username,
            'score': entry.score
        })
        
    return jsonify({'success': True, 'leaderboard': result})

@app.route('/api/user_stats', methods=['GET'])
def get_user_stats():
    if 'user_id' not in session:
        return jsonify({'success': False}), 401
    
    user = User.query.get(session['user_id'])
    
    # 计算总场次
    total_games = GameSession.query.filter(GameSession.user_id == user.id).count()
    
    # 计算最高分
    best_game = GameSession.query.filter(GameSession.user_id == user.id).order_by(GameSession.score.desc()).first()
    high_score = best_game.score if best_game else 0
    
    # 计算平均时长
    avg_duration = 0
    if total_games > 0:
        durations = [g.duration for g in GameSession.query.filter(GameSession.user_id == user.id).all() if g.duration]
        if durations:
            avg_duration = int(sum(durations) / len(durations))
    
    return jsonify({
        'success': True,
        'stats': {
            'total_games': total_games,
            'high_score': high_score,
            'avg_duration': avg_duration
        },
        'last_login': user.last_login.isoformat() if user.last_login else None
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
