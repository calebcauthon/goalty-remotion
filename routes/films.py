from flask import Blueprint, request, jsonify
from datetime import datetime
import database

films_bp = Blueprint('films', __name__)

@films_bp.route('/', methods=['GET'])
def get_films():
    try:
        films = database.get_films()
        return jsonify(films), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@films_bp.route('', methods=['POST'])
def create_film():
    try:
        name = request.json.get('name', 'Untitled Film')
        created_date = datetime.now().isoformat()
        
        film_id = database.create_film(name, created_date)
        
        return jsonify({
            'id': film_id,
            'name': name,
            'created_date': created_date,
            'data': {}
        }), 201
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@films_bp.route('/<int:film_id>', methods=['GET'])
def get_film(film_id):
    try:
        film = database.get_film_by_id(film_id)
        if not film:
            return jsonify({'error': 'Film not found'}), 404
        return jsonify(film), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@films_bp.route('/<int:film_id>/name', methods=['PUT'])
def update_film_name(film_id):
    try:
        name = request.json.get('name')
        if not name:
            return jsonify({'error': 'Name is required'}), 400
            
        success = database.update_film_name(film_id, name)
        if not success:
            return jsonify({'error': 'Film not found'}), 404
            
        return jsonify({'message': 'Film name updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@films_bp.route('/<int:film_id>', methods=['DELETE'])
def delete_film(film_id):
    try:
        success = database.delete_film(film_id)
        if not success:
            return jsonify({'error': 'Film not found'}), 404
        return jsonify({'message': 'Film deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@films_bp.route('/<int:film_id>/data', methods=['PUT'])
def update_film_data(film_id):
    try:
        data = request.json.get('data')
        if data is None:
            return jsonify({'error': 'Data is required'}), 400
            
        success = database.update_film_data(film_id, data)
        if not success:
            return jsonify({'error': 'Film not found'}), 404
            
        return jsonify({'message': 'Film data updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500 