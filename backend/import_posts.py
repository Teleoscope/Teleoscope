from pydoc import pathdirs
from celery import chain, group
from backend.archive.import_document_tasks import read_and_validate_document, vectorize_document, add_single_document_to_database, add_multiple_documents_to_database, validate_document
import glob, sys, utils, json, tensorflow_hub as hub


def import_single_document(path_to_document):
	workflow = chain(
			read_and_validate_document.s(path_to_document),
			vectorize_document.s(),
			add_single_document_to_database.s()).apply_async()

def import_multiple_documents(path_to_folder):
	# Get all paths in the folder
	paths = glob.glob(path_to_folder + '/*.json')
	embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
	for path in paths:
		curr_page = path.split("/")[-1]
		# Read document
		with open(path, "r") as f:
			documents = json.load(f)
		# Hack for files containing a single document
		if type(documents) != list:
			documents = [documents]
		print(f'Sucessfully read {curr_page}')
		# Validate document
		documents = group(validate_document.s(document) for document in documents).apply_async().get()
		print(f'Sucessfully validated {curr_page}')
		# Filter documents
		documents = (list (filter (lambda x: 'error' not in x, documents)))
		# Vectorize documents
		for document in documents:
			document['vector'] =  embed([document['title']]).numpy()[0].tolist()
			document['textVector'] = embed([document['text']]).numpy()[0].tolist()
		print(f'Sucessfully vectorized {curr_page}')
		# Insert
		add_multiple_documents_to_database.delay(documents=documents)
		print(f'Sucessfully inserted {curr_page}\n')
		# # Keep a track of page number written last 
		# TODO: Add a file before using
		# with open(f'../{path_to_folder}/written.txt', 'w+') as f: f.write(curr_page)


if __name__ == '__main__':
	if len(sys.argv) > 2 and sys.argv[1] == '-f':
		import_single_document(sys.argv[2])
	elif len(sys.argv) > 2 and sys.argv[1] == '-d':
		import_multiple_documents(sys.argv[2])
	else:
		print('Invalid arguments. Use -f for single document or -d for folder\n')
		print("Usage: python3 import_documents.py -f <path_to_document>")
		print("Usage: python3 import_documents.py -d <path_to_folder>")
		sys.exit(1)
