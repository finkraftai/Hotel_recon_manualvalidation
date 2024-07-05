from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from bson import ObjectId
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import MONGODB_CONNECTION_STRING, DATABASE_FUZZY, COLLECTION_FUZZY_OUTPUT, COLLECTION_GST_INPUT_2B, DATABASE_GST,AWS_ACCESS_KEY, AWS_SECRET_KEY, REGION_NAME, BUCKET_NAME, SELECTED_COLUMN
import json
from datetime import datetime
import boto3
from botocore.exceptions import NoCredentialsError
from flask import Response
from bson import ObjectId 
from bson import ObjectId

app = Flask(__name__)
CORS(app)

aws_access_key_id = AWS_ACCESS_KEY
aws_secret_access_key = AWS_SECRET_KEY
region_name = REGION_NAME
s3_client = boto3.client(
    's3',
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key,
    region_name=region_name
)
bucket_name = BUCKET_NAME

connection_string = MONGODB_CONNECTION_STRING
client = MongoClient(connection_string)
db_name = DATABASE_FUZZY
matches_collection_name = COLLECTION_FUZZY_OUTPUT
selected_column_collection_name = SELECTED_COLUMN



def convert_object_ids(data):
    """Convert MongoDB ObjectId to string."""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, ObjectId):
                data[key] = str(value)
            elif isinstance(value, list):
                data[key] = [convert_object_ids(item) for item in value]
            elif isinstance(value, dict):
                data[key] = convert_object_ids(value)
    elif isinstance(data, list):
        return [convert_object_ids(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    return data

@app.route('/matches', methods=['GET'])
def fetch_matches():
    try:
        db = client[db_name]
        collection = db[matches_collection_name]
        document_id = request.args.get('documentId')

        if document_id:
            try:
                document_object_id = ObjectId(document_id)
                data = list(collection.find({'_id': document_object_id}).limit(1))
            except Exception as e:
                return jsonify({'error': 'Invalid document ID format', 'details': str(e)}), 400
        else:
            filter_criteria = {"$or": [{"seen": {"$exists": False}}, {"seen": None}, {"seen": False}]}
            data = list(collection.find(filter_criteria).limit(1))

        for doc in data:
            file_name = f"test/{doc['booking_data']['original_filename']}"
            try:
                signed_url = s3_client.generate_presigned_url('get_object', Params={'Bucket': bucket_name, 'Key': file_name}, ExpiresIn=3600)
                doc['url'] = signed_url
            except NoCredentialsError:
                return jsonify({'error': 'Credentials not available'}), 500
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        cleaned_data = convert_object_ids(data)
        return jsonify(cleaned_data), 200

    except ConnectionFailure:
        return jsonify({'error': 'Database connection failed'}), 500

@app.route('/matchesOutputTable', methods=['GET'])
def fetch_matches_table():
    try:
        db = client[db_name]
        collection = db[matches_collection_name]
        document_id = request.args.get('documentId')

        if document_id:
            try:
                document_object_id = ObjectId(document_id)
                data = list(collection.find({'_id': document_object_id}).limit(1))
            except Exception as e:
                return jsonify({'error': 'Invalid document ID format', 'details': str(e)}), 400
        else:
            data = list(collection.find())

        for doc in data:
            file_name = f"test/{doc['booking_data']['original_filename']}"
            try:
                signed_url = s3_client.generate_presigned_url('get_object', Params={'Bucket': bucket_name, 'Key': file_name}, ExpiresIn=3600)
                doc['url'] = signed_url
            except NoCredentialsError:
                return jsonify({'error': 'Credentials not available'}), 500
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        cleaned_data = convert_object_ids(data)
        return jsonify(cleaned_data), 200

    except ConnectionFailure:
        return jsonify({'error': 'Database connection failed'}), 500

@app.route('/saveSeenValue', methods=['POST'])
def save_seen_value():
    try:
        db = client[db_name]
        matches_collection = db[matches_collection_name]
        document_id = request.args.get('documentId')
        seen_value = request.json.get('seen')

        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400

        try:
            document_object_id = ObjectId(document_id)
        except Exception as e:
            return jsonify({'error': 'Invalid document ID format', 'details': str(e)}), 400

        result = matches_collection.update_one(
            {'_id': document_object_id},
            {'$set': {'seen': seen_value}}
        )

        if result.matched_count == 0:
            return jsonify({'error': 'Document not found'}), 404

        return jsonify({'message': 'Seen value updated successfully'}), 200

    except ConnectionFailure:
        return jsonify({'error': 'Database connection failed'}), 500
    
@app.route('/saveSelectedColumn', methods=['POST'])
def save_selected_column():
    try:
        db = client[db_name]
        collection = db[matches_collection_name]
        selected_data = request.json
        document_id = request.args.get('documentId')

        if not document_id:
            return jsonify({'error': 'Document ID is required'}), 400

        try:
            object_id = ObjectId(document_id)
        except Exception as e:
            return jsonify({'error': 'Invalid Document ID format', 'details': str(e)}), 400

        # Debug: Print the data being updated
        print(f"Updating document ID {document_id} with selected data: {selected_data}")

        result = collection.update_one({"_id": object_id}, {"$set": {"selected": selected_data}})
        if result.matched_count == 0:
            return jsonify({'error': 'Document not found'}), 404

        return jsonify({'message': 'Selected column data saved successfully'}), 200

    except ConnectionFailure:
        return jsonify({'error': 'Database connection failed'}), 500
    except Exception as e:
        print(f"Error saving selected column: {str(e)}")  # Debug: Print the error
        return jsonify({'error': str(e)}), 500

@app.route('/nextDocument', methods=['GET'])
def next_document():
    try:
        db = client[db_name]
        matches_collection = db[matches_collection_name]

        # Query for the next document where 'seen' is not true
        next_doc = matches_collection.find_one({
            "$or": [
                {"seen": {"$exists": False}},
                {"seen": None},
                {"seen": False}
            ],
            
            
            "_id": {"$ne": ObjectId(request.args.get('documentId'))}
        })

        if next_doc:
            next_doc['_id'] = str(next_doc['_id'])  # Convert ObjectId to string
            if 'booking_data' in next_doc and 'original_filename' in next_doc['booking_data']:
                file_name = f"test/{next_doc['booking_data']['original_filename']}"
                try:
                    signed_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': bucket_name, 'Key': file_name},
                        ExpiresIn=3600
                    )
                    next_doc['url'] = signed_url
                except NoCredentialsError:
                    return jsonify({'error': 'Credentials not available'}), 500
                except Exception as e:
                    return jsonify({'error': str(e)}), 500

            # Ensure all ObjectIds in the document are converted to strings
            next_doc = convert_object_ids(next_doc)
            
            return jsonify(next_doc), 200
        else:
            return jsonify({'message': 'No more documents to fetch'}), 404
    except Exception as e:
        print(f"Error fetching next document: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.patch('/updateSelected/<string:id>')
def update_selected(id):
    db = client[db_name]
    matches_collection = db[matches_collection_name]
    try:
        selected = request.json['selected']
        matches_collection.update_one(
            {'_id': ObjectId(id)},
            {'$set': {'selected': selected}}
        )
        return jsonify({'message': 'Selected field updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
