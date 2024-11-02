from flask import Blueprint, request, jsonify
import database

hotkeys_bp = Blueprint('hotkeys', __name__)

@hotkeys_bp.route('/', methods=['GET'])
def get_hotkeys():
    try:
        hotkeys = database.get_all_hotkeys()
        return jsonify(hotkeys), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hotkeys_bp.route('/new', methods=['POST'])
def create_hotkey_group():
    try:
        name = request.json.get('name', 'New Hotkey Group')
        group_id = database.add_hotkey_group(name, {})
        return jsonify({'id': group_id}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hotkeys_bp.route('/<int:group_id>', methods=['GET'])
def get_hotkey_group(group_id):
    try:
        hotkeys = database.get_all_hotkeys()
        group = next((group for group in hotkeys if group['id'] == group_id), None)
        if group:
            return jsonify(group), 200
        return jsonify({'error': 'Hotkey group not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hotkeys_bp.route('/<int:group_id>/rename', methods=['PUT'])
def rename_hotkey_group(group_id):
    try:
        new_name = request.json.get('name')
        if not new_name:
            return jsonify({'error': 'Name is required'}), 400
            
        success = database.update_hotkey_group_name(group_id, new_name)
        if success:
            return jsonify({'message': 'Name updated successfully'}), 200
        return jsonify({'error': 'Hotkey group not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hotkeys_bp.route('/<int:group_id>/update-shortcuts', methods=['PUT'])
def update_hotkey_shortcuts(group_id):
    try:
        data = request.get_json()
        shortcuts = data.get('shortcuts')
        
        if shortcuts is None:
            return jsonify({'error': 'Shortcuts data is required'}), 400
            
        success = database.update_hotkey_shortcuts(group_id, shortcuts)
        
        if success:
            return jsonify({'message': 'Shortcuts updated successfully'})
        return jsonify({'error': 'Failed to update shortcuts'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hotkeys_bp.route('/<int:group_id>', methods=['DELETE'])
def delete_hotkey_group(group_id):
    try:
        success = database.delete_hotkey_group(group_id)
        if success:
            return jsonify({'message': 'Hotkey group deleted successfully'}), 200
        return jsonify({'error': 'Hotkey group not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500