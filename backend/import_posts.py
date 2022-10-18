from pydoc import pathdirs
from celery import chain, group
from import_post_tasks import read_and_validate_post, vectorize_post, add_single_post_to_database, add_multiple_posts_to_database, validate_post
import glob, sys, utils, json, tensorflow_hub as hub


def import_single_post(path_to_post):
	workflow = chain(
			read_and_validate_post.s(path_to_post),
			vectorize_post.s(),
			add_single_post_to_database.s()).apply_async()

def import_multiple_posts(path_to_folder):
	# Get all paths in the folder
	paths = glob.glob(path_to_folder + '/*.json')
	paths.sort(key = lambda x: int("".join([d for d in x if d.isdigit()])))
	embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
	for path in paths:
		curr_page = path.split("/")[-1]
		# Read post
		with open(path, "r") as f:
			posts = json.load(f)
		# Hack for files containing a single post
		if type(posts) != list:
			posts = [posts]
		print(f'Sucessfully read {curr_page}')
		# Validate post
		posts = group(validate_post.s(post) for post in posts).apply_async().get()
		print(f'Sucessfully validated {curr_page}')
		# Filter posts
		posts = (list (filter (lambda x: 'error' not in x, posts)))
		# Vectorize posts
		for post in posts:
			post['vector'] =  embed([post['title']]).numpy()[0].tolist()
			post['selftextVector'] = embed([post['selftext']]).numpy()[0].tolist()
		print(f'Sucessfully vectorized {curr_page}')
		# Insert
		add_multiple_posts_to_database.delay(posts=posts)
		print(f'Sucessfully inserted {curr_page}\n')
		# # Keep a track of page number written last 
		# TODO: Add a file before using
		# with open(f'../{path_to_folder}/written.txt', 'w+') as f: f.write(curr_page)


if __name__ == '__main__':
	if len(sys.argv) > 2 and sys.argv[1] == '-f':
		import_single_post(sys.argv[2])
	elif len(sys.argv) > 2 and sys.argv[1] == '-d':
		import_multiple_posts(sys.argv[2])
	else:
		print('Invalid arguments. Use -f for single post or -d for folder\n')
		print("Usage: python3 import_posts.py -f <path_to_post>")
		print("Usage: python3 import_posts.py -d <path_to_folder>")
		sys.exit(1)
