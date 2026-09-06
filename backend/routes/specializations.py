import re
from flask import Blueprint, request, jsonify
from models import db, Specialization
from utils.auth_middleware import admin_required

specializations_bp = Blueprint('specializations', __name__, url_prefix='/api/specializations')

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

@specializations_bp.route('', methods=['GET'])
def get_specializations():
    specs = Specialization.query.order_by(Specialization.name.asc()).all()
    return jsonify({
        'success': True,
        'count': len(specs),
        'specializations': [s.to_dict() for s in specs]
    }), 200

@specializations_bp.route('/<int:spec_id>', methods=['GET'])
def get_specialization(spec_id):
    spec = Specialization.query.get(spec_id)
    if not spec:
        return jsonify({'success': False, 'message': 'Specialization not found.'}), 404
    return jsonify({
        'success': True,
        'specialization': spec.to_dict()
    }), 200

@specializations_bp.route('', methods=['POST'])
@admin_required
def create_specialization():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    icon = (data.get('icon') or 'FaStethoscope').strip()
    image = (data.get('image') or '').strip()

    if not name:
        return jsonify({'success': False, 'message': 'Specialization name is required.'}), 400

    slug = slugify(name)
    if Specialization.query.filter((Specialization.name == name) | (Specialization.slug == slug)).first():
        return jsonify({'success': False, 'message': 'Specialization with this name already exists.'}), 409

    spec = Specialization(
        name=name,
        slug=slug,
        description=description,
        icon=icon,
        image=image
    )
    db.session.add(spec)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Specialization created successfully.',
        'specialization': spec.to_dict()
    }), 201

@specializations_bp.route('/<int:spec_id>', methods=['PUT'])
@admin_required
def update_specialization(spec_id):
    spec = Specialization.query.get(spec_id)
    if not spec:
        return jsonify({'success': False, 'message': 'Specialization not found.'}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        name = data['name'].strip()
        spec.name = name
        spec.slug = slugify(name)
    if 'description' in data:
        spec.description = data['description'].strip()
    if 'icon' in data:
        spec.icon = data['icon'].strip()
    if 'image' in data:
        spec.image = data['image'].strip()

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Specialization updated successfully.',
        'specialization': spec.to_dict()
    }), 200

@specializations_bp.route('/<int:spec_id>', methods=['DELETE'])
@admin_required
def delete_specialization(spec_id):
    spec = Specialization.query.get(spec_id)
    if not spec:
        return jsonify({'success': False, 'message': 'Specialization not found.'}), 404

    if spec.doctors:
        return jsonify({
            'success': False,
            'message': f'Cannot delete specialization. There are {len(spec.doctors)} doctors assigned to it.'
        }), 400

    db.session.delete(spec)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Specialization deleted successfully.'
    }), 200
