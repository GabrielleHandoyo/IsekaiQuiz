from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import uuid
import json
import os
from datetime import datetime
import traceback
import sys

#------------------------------------------------------------------------------

#                            FLASK APPLICATION SETUP

#------------------------------------------------------------------------------

app = Flask(__name__)
app.secret_key = "reincarnation_quiz_secret"  # Secret key for session management

# Configure CORS to allow cross-origin requests from any source
# Allows communication between frontend and backend
CORS(app, resources={r"/*": {
    "origins": [
        "https://isekaiquiz.netlify.app", 
        "https://isekaiquiz.com"
    ],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": "*"
}})

#------------------------------------------------------------------------------

#                         DATA LOADING AND INITIALIZATION

#------------------------------------------------------------------------------

# Load quiz questions from the JSON file
with open('questions.json', 'r', encoding='utf-8') as f:
    QUESTIONS = json.load(f)

# Define personality types and their corresponding creature results
RESULTS = {
    'INTJ': {
        'type': 'Mastermind', 
        'creature': 'Lich', 
        'description': 'Brilliant strategist with immense arcane knowledge. Immortal, calculating, and always three steps ahead.',
        'image_path': '/images/creatures/lich.jpg'
    },
    'INTP': {
        'type': 'Thinker', 
        'creature': 'Wizard', 
        'description': 'Curious, theoretical, and obsessed with understanding the underlying magic of the universe.',
        'image_path': '/images/creatures/wizard.jpg'
    },
    'ENTJ': {
        'type': 'Commander', 
        'creature': 'Dragon', 
        'description': 'Powerful, ambitious, and commanding respect from all who meet you. You collect both treasures and followers.',
        'image_path': '/images/creatures/dragon.jpg'
    },
    'ENTP': {
        'type': 'Debater', 
        'creature': 'Chest Mimic', 
        'description': 'Clever, witty, and full of surprises. You challenge assumptions and enjoy turning situations upside down.',
        'image_path': '/images/creatures/chest-mimic.jpg'
    },
    'INFJ': {
        'type': 'Advocate', 
        'creature': 'Phoenix', 
        'description': 'Rare and insightful, you rise from adversity and inspire others with your vision and resilience.',
        'image_path': '/images/creatures/phoenix.jpg'
    },
    'INFP': {
        'type': 'Mediator', 
        'creature': 'Unicorn', 
        'description': 'Pure of heart, idealistic, and magical. You bring healing and inspiration wherever you go.',
        'image_path': '/images/creatures/unicorn.jpg'
    },
    'ENFJ': {
        'type': 'Protagonist', 
        'creature': 'Hero', 
        'description': 'Born leader with charisma and a natural desire to champion others in their quests and dreams.',
        'image_path': '/images/creatures/hero.jpg'
    },
    'ENFP': {
        'type': 'Campaigner', 
        'creature': 'Chimera', 
        'description': 'Creative, enthusiastic, and multi-talented. Your diverse nature means you\'re never predictable.',
        'image_path': '/images/creatures/chimera.jpg'
    },
    'ISTJ': {
        'type': 'Logistician', 
        'creature': 'Cerberus', 
        'description': 'Loyal, reliable guardian with keen attention to detail and unwavering commitment to duty.',
        'image_path': '/images/creatures/cerberus.jpg'
    },
    'ISFJ': {
        'type': 'Defender', 
        'creature': 'Treant', 
        'description': 'Nurturing protector with deep roots and a strong sense of tradition and caring.',
        'image_path': '/images/creatures/treant.jpg'
    },
    'ESTJ': {
        'type': 'Executive', 
        'creature': 'Minotaur', 
        'description': 'Strong, decisive, and practical leader who establishes order through clear rules and structures.',
        'image_path': '/images/creatures/minotaur.jpg'
    },
    'ESFJ': {
        'type': 'Consul', 
        'creature': 'Griffon', 
        'description': 'Noble, vigilant protector who brings people together and maintains social harmony.',
        'image_path': '/images/creatures/griffon.jpg'
    },
    'ISTP': {
        'type': 'Virtuoso', 
        'creature': 'Anaconda', 
        'description': 'Adaptable, observant, and masterful at striking at just the right moment with precision.',
        'image_path': '/images/creatures/anaconda.jpg'
    },
    'ISFP': {
        'type': 'Adventurer', 
        'creature': 'Elf', 
        'description': 'Artistic, sensitive, and in tune with the natural world. You live life with quiet passion.',
        'image_path': '/images/creatures/elf.jpg'
    },
    'ESTP': {
        'type': 'Entrepreneur', 
        'creature': 'Werewolf', 
        'description': 'Bold, adaptable, and thriving on excitement. You transform to meet any challenge head-on.',
        'image_path': '/images/creatures/werewolf.jpg'
    },
    'ESFP': {
        'type': 'Entertainer', 
        'creature': 'Slime', 
        'description': 'Flexible, joyful, and surprisingly resilient. You bounce back from anything and bring smiles wherever you go.',
        'image_path': '/images/creatures/slime.jpg'
    }
}

# Dictionary to store active quiz sessions
quiz_sessions = {}

#------------------------------------------------------------------------------

#                              HELPER FUNCTIONS

#------------------------------------------------------------------------------

def initialize_ratings_file():
    """
    Creates or ensures a ratings file exists with proper structure.
    The ratings file stores user feedback and statistics about quiz results.
    """
    try:
        with open('ratings.json', 'r') as f:
            # File exists, check if it's valid JSON
            try:
                json.load(f)
            except json.JSONDecodeError:
                # File exists but isn't valid JSON, recreate it
                with open('ratings.json', 'w') as f:
                    json.dump({"ratings": [], "stats": {"avg": 0, "count": 0}}, f)
    except FileNotFoundError:
        # File doesn't exist, create it
        with open('ratings.json', 'w') as f:
            json.dump({"ratings": [], "stats": {"avg": 0, "count": 0}}, f)

# Initialize the ratings file when the app starts
initialize_ratings_file()

def calculate_personality_type(scores):
    """
    Calculates personality type based on scores for each trait dimension.
    
    Args:
        scores: Dictionary containing scores for E, I, S, N, T, F, J, P
        
    Returns:
        String containing 4-letter personality type (e.g., "INTJ")
    """
    personality_traits = []
    
    # E vs I (Extraversion vs Introversion)
    e_score = scores['E']
    i_score = scores['I']
    if e_score > i_score:
        personality_traits.append('E')  # Extraverted
    else:
        personality_traits.append('I')  # Introverted
    
    # S vs N (Sensing vs Intuition)
    s_score = scores['S']
    n_score = scores['N']
    if s_score > n_score:
        personality_traits.append('S')  # Sensing
    else:
        personality_traits.append('N')  # Intuitive
    
    # T vs F (Thinking vs Feeling)
    t_score = scores['T']
    f_score = scores['F']
    if t_score > f_score:
        personality_traits.append('T')  # Thinking
    else:
        personality_traits.append('F')  # Feeling
    
    # J vs P (Judging vs Perceiving)
    j_score = scores['J']
    p_score = scores['P']
    if j_score > p_score:
        personality_traits.append('J')  # Judging
    else:
        personality_traits.append('P')  # Perceiving
    
    # Return the 4-letter personality type
    return ''.join(personality_traits)

#------------------------------------------------------------------------------

#                                ROUTE HANDLERS

#------------------------------------------------------------------------------

@app.route('/images/<path:filename>')
def serve_image(filename):
    """
    Takes image files directly from the images directory.
    Allows frontend to access creature images.
    
    Args:
        filename: Path to the image file
        
    Returns:
        The requested image file
    """
    return send_from_directory('images', filename)

@app.route('/api/start_quiz', methods=['POST', 'OPTIONS'])
def start_quiz():
    """
    Initializes a new quiz session and returns the first question.
    
    For OPTIONS requests, handles CORS preflight.
    For POST requests, creates new session with a unique ID.
    
    Returns:
        JSON with session_id and first question
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
        
    # Generate a unique session ID
    session_id = str(uuid.uuid4())
    
    # Initialize quiz state with default values
    quiz_sessions[session_id] = {
        'current_step': 0,                 # Track which question we're on
        'scores': {'E': 0, 'I': 0, 'S': 0, 'N': 0, 'T': 0, 'F': 0, 'J': 0, 'P': 0},  # Personality trait scores
        'responses': {},                   # Store user's answers
        'trait_questions': {'E': [], 'I': [], 'S': [], 'N': [], 'T': [], 'F': [], 'J': [], 'P': []},  # Track which questions contributed to which traits
        'created_at': datetime.now()       # Add timestamp for potential session cleanup
    }
    
    # Return the session ID and first question
    return jsonify({
        'session_id': session_id,
        'question': QUESTIONS[0]  # First question in the list
    })

@app.route('/api/answer', methods=['POST', 'OPTIONS'])
def process_answer():
    """
    Processes the user's answer to a question and returns the next question or final result.
    
    1. Stores the user's response
    2. Updates personality trait scores based on the user's response
    3. Returns the god's reply to the choice
    4. Returns either the next question or the final quiz result
    
    If the session is invalid, it creates a new session and starts the quiz over.
    
    Returns:
        JSON with god_response and either next_question or quiz_complete with result
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
        
    data = request.json
    session_id = data.get('session_id')
    choice = data.get('choice')
    
    # Validate the session - if invalid, create a new one
    if not session_id or session_id not in quiz_sessions:
        # Create a new session instead of returning an error
        new_session_id = str(uuid.uuid4())
        
        # Initialize quiz state with default values
        quiz_sessions[new_session_id] = {
            'current_step': 0,
            'scores': {'E': 0, 'I': 0, 'S': 0, 'N': 0, 'T': 0, 'F': 0, 'J': 0, 'P': 0},
            'responses': {},
            'trait_questions': {'E': [], 'I': [], 'S': [], 'N': [], 'T': [], 'F': [], 'J': [], 'P': []},
            'created_at': datetime.now()
        }
        
        # Return the first question with the new session ID
        return jsonify({
            'session_replaced': True,
            'message': 'Your session was reset due to inactivity. Starting a new quiz.',
            'session_id': new_session_id,
            'question': QUESTIONS[0]
        })
    
    quiz_state = quiz_sessions[session_id]
    current_step = quiz_state['current_step']
    
    # Store the user's response
    quiz_state['responses'][str(current_step)] = choice
    
    # Get current question
    question = QUESTIONS[current_step]
    question_id = question.get('id', f'unknown-{current_step}')
    
    # Update scores for personality traits (only for actual quiz questions, index 2+ because of 2 intros)
    if current_step >= 2:
        selected_option = next((o for o in question['options'] if o['text'] == choice), None)
        if selected_option and 'trait' in selected_option:
            trait = selected_option['trait']
            quiz_state['scores'][trait] += 1
            
            # Store which questions contributed to which traits for result breakdown
            quiz_state['trait_questions'][trait].append({
                'question_id': question_id,
                'question_text': question['text'][:30] + "...",  # Truncate long questions
                'choice': choice
            })
    
    # Get god's response for the current choice
    god_response = ""
    selected_option = next((o for o in question['options'] if o['text'] == choice), None)
    if selected_option and 'response' in selected_option:
        god_response = selected_option['response']
    
    # Special case handling: if this is q19, make sure q20 is next regardless of ordering
    # Added due to q20 not being counted somehow
    if question_id == 'q19':
        # Find q20 index
        q20_index = None
        for i, q in enumerate(QUESTIONS):
            if q.get('id') == 'q20':
                q20_index = i
                break
                
        if q20_index is not None:
            # Set next step to q20 index
            next_step = q20_index
            quiz_state['current_step'] = q20_index
            
            # Return q20 next
            return jsonify({
                'god_response': god_response,
                'next_question': QUESTIONS[q20_index]
            })
    
    # Normal flow for other questions
    next_step = current_step + 1
    quiz_state['current_step'] = next_step
    
    # Check if we have more questions
    if next_step < len(QUESTIONS):
        # Return god's response and next question
        return jsonify({
            'god_response': god_response,
            'next_question': QUESTIONS[next_step]
        })
    else:
        # Quiz complete, calculate final personality type and result
        scores = quiz_state['scores']
        
        # Use the helper function to calculate personality type
        personality_type = calculate_personality_type(scores)
        
        # Get the corresponding result or fallback to Mystery Being if not found
        result = RESULTS.get(personality_type)
        
        if result is None:
            result = {
                'type': 'Unknown', 
                'creature': 'Mystery Being', 
                'description': f'A mysterious creature beyond classification. Your personality type was {personality_type} but it could not be matched.',
                'image_path': '/images/creatures/mystery-being.jpg'
            }
        
        # Create full URL for the image (including server domain)
        base_url = request.url_root.rstrip('/')
        image_url = base_url + result['image_path']
        
        # Add detailed trait comparisons
        trait_comparisons = {
            'E_vs_I': f"Extraversion ({scores['E']}) vs Introversion ({scores['I']}): {personality_type[0]}",
            'S_vs_N': f"Sensing ({scores['S']}) vs Intuition ({scores['N']}): {personality_type[1]}",
            'T_vs_F': f"Thinking ({scores['T']}) vs Feeling ({scores['F']}): {personality_type[2]}",
            'J_vs_P': f"Judging ({scores['J']}) vs Perceiving ({scores['P']}): {personality_type[3]}"
        }
        
        # Print trait comparisons to server console
        print("\n===== PERSONALITY ASSESSMENT =====")
        print(f"Session ID: {session_id}")
        print(f"Final Type: {personality_type} ({result['type']} - {result['creature']})")
        print(f"● {trait_comparisons['E_vs_I']}")
        print(f"● {trait_comparisons['S_vs_N']}")
        print(f"● {trait_comparisons['T_vs_F']}")
        print(f"● {trait_comparisons['J_vs_P']}")
        print("=================================\n")
        
        # Return final result with complete details
        return jsonify({
            'god_response': god_response,
            'quiz_complete': True,
            'result': {
                'personality_type': personality_type,
                'type_name': result['type'],
                'creature': result['creature'],
                'image_url': image_url,
                'description': result['description'],
                'scores': scores,
                'trait_questions': quiz_state['trait_questions'],
                'trait_comparisons': trait_comparisons
            }
        })

@app.route('/api/restart', methods=['POST', 'OPTIONS'])
def restart_quiz():
    """
    Restarts the quiz, either with the existing session ID or by creating a new one.
    This allows users to retake the quiz without losing their progress.
    
    If the provided session ID is invalid, a new session is created instead of returning an error.
    
    Returns:
        JSON with the first actual question (q1, which is at index 2) and potentially a new session_id
    """
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
        
    data = request.json
    session_id = data.get('session_id')
    create_new_session = False
    
    # Check if we need to create a new session
    if not session_id or session_id not in quiz_sessions:
        # Instead of returning an error, create a new session
        session_id = str(uuid.uuid4())
        create_new_session = True
    
    # Reset or initialize quiz state but start from question 2 (skip intro and intro2)
    quiz_sessions[session_id] = {
        'current_step': 2,  # Start from first actual question (q1)
        'scores': {'E': 0, 'I': 0, 'S': 0, 'N': 0, 'T': 0, 'F': 0, 'J': 0, 'P': 0},
        'responses': {},
        'trait_questions': {'E': [], 'I': [], 'S': [], 'N': [], 'T': [], 'F': [], 'J': [], 'P': []}
    }
    
    # If we created a new session, include the session_id in the response
    if create_new_session:
        return jsonify({
            'session_id': session_id,
            'question': QUESTIONS[2]  # Index 2 is q1 (after intro and intro2)
        })
    else:
        # Otherwise, just return the question
        return jsonify({
            'question': QUESTIONS[2]  # Index 2 is q1 (after intro and intro2)
        })

@app.route('/api/submit_rating', methods=['POST', 'OPTIONS'])
def submit_rating():
    """
    Records only aggregate rating statistics
    
    Returns:
        JSON with success message and updated statistics
    """
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
    
    try:
        # Check if request has JSON data
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.json
        rating = data.get('rating')
            
        if not rating:
            return jsonify({'error': 'Missing rating'}), 400
            
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be an integer from 1-5'}), 400
        
        # Load existing statistics (but not individual ratings)
        try:
            with open('ratings.json', 'r') as f:
                ratings_data = json.load(f)
                
                # If this is a fresh file, ensure it has the right structure
                if 'stats' not in ratings_data:
                    ratings_data['stats'] = {
                        "avg": 0,
                        "count": 0,
                        "distribution": {
                            "1": 0, "2": 0, "3": 0, "4": 0, "5": 0
                        }
                    }
                
                # Ensure we have an empty ratings array (we don't store individual ratings)
                ratings_data['ratings'] = []
        except (FileNotFoundError, json.JSONDecodeError):
            # Create default structure if file doesn't exist or is invalid
            ratings_data = {
                "ratings": [],
                "stats": {
                    "avg": 0,
                    "count": 0,
                    "distribution": {
                        "1": 0, "2": 0, "3": 0, "4": 0, "5": 0
                    }
                }
            }
        
        # Update statistics directly without storing individual ratings
        current_stats = ratings_data['stats']
        
        # Update count and calculate new average
        old_total = current_stats['avg'] * current_stats['count']
        current_stats['count'] += 1
        current_stats['avg'] = round((old_total + rating) / current_stats['count'], 2)
        
        # Update distribution
        rating_str = str(rating)
        if rating_str in current_stats['distribution']:
            current_stats['distribution'][rating_str] += 1
        
        # Save updated statistics
        try:
            with open('ratings.json', 'w') as f:
                json.dump(ratings_data, f, indent=2)
        except Exception as e:
            return jsonify({'error': 'Failed to save rating statistics'}), 500
        
        return jsonify({
            "success": True,
            "message": "Rating recorded anonymously",
            "stats": current_stats
        })
        
    except Exception as e:
        error_msg = f"Error processing rating: {str(e)}"
        return jsonify({'error': error_msg}), 500

@app.route('/api/ratings', methods=['GET', 'OPTIONS'])
def get_ratings():
    """
    Retrieves the current rating statistics.
    Used by the admin dashboard to display user feedback data.
    
    Returns:
        JSON with rating statistics (average, count, distribution)
    """
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        with open('ratings.json', 'r') as f:
            ratings_data = json.load(f)
            return jsonify(ratings_data["stats"])
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"error": "No ratings data available"}), 404

@app.route('/api/debug/ratings', methods=['GET'])
def debug_ratings_file():
    """
    Debug endpoint to check ratings file path and permissions.
    This helps troubleshoot issues with the ratings storage.
    
    Returns:
        JSON with detailed information about the ratings file and filesystem
    """
    try:
        # Get current working directory
        cwd = os.getcwd()
        
        # Check if ratings.json exists
        ratings_path = os.path.join(cwd, 'ratings.json')
        file_exists = os.path.isfile(ratings_path)
        
        # Check permissions if file exists
        if file_exists:
            readable = os.access(ratings_path, os.R_OK)
            writable = os.access(ratings_path, os.W_OK)
            
            # Try to read the file
            file_contents = None
            try:
                with open(ratings_path, 'r') as f:
                    file_contents = json.load(f)
            except Exception as e:
                file_contents = f"Error reading file: {str(e)}"
                
            dir_writable = True
            file_created = True
        else:
            readable = False
            writable = False
            file_contents = None
            
            # Check if directory is writable
            dir_writable = os.access(cwd, os.W_OK)
            
            # Try to create the file
            try:
                with open(ratings_path, 'w') as f:
                    json.dump({"ratings": [], "stats": {"avg": 0, "count": 0}}, f)
                file_created = os.path.isfile(ratings_path)
            except Exception as e:
                file_created = False
        
        # Return debug info
        return jsonify({
            'cwd': cwd,
            'ratings_path': ratings_path,
            'file_exists': file_exists,
            'readable': readable,
            'writable': writable,
            'dir_writable': dir_writable if not file_exists else True,
            'file_created': file_created if not file_exists else True,
            'file_contents': file_contents
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

#------------------------------------------------------------------------------

#                         SESSION CLEANUP FUNCTION

#------------------------------------------------------------------------------

def cleanup_old_sessions():
    """
    Removes sessions older than 24 hours to prevent memory bloat.
    Called periodically to keep the sessions dictionary clean.
    
    """
    now = datetime.now()
    expired_sessions = []
    
    # Find expired sessions (older than 24 hours)
    for session_id, session_data in quiz_sessions.items():
        if 'created_at' in session_data:
            session_age = now - session_data['created_at']
            # If session is older than 24 hours (86400 seconds)
            if session_age.total_seconds() > 86400:
                expired_sessions.append(session_id)
    
    # Remove expired sessions
    for session_id in expired_sessions:
        del quiz_sessions[session_id]

#------------------------------------------------------------------------------

#                         MAIN APPLICATION ENTRY POINT

#------------------------------------------------------------------------------

if __name__ == '__main__':
    # Ensure image directory exists before starting
    os.makedirs('images/creatures', exist_ok=True)
    
    # Start the Flask development server
    app.run(debug=True)