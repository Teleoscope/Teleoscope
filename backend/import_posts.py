from celery import chain, group, chord
from tasks import read_and_validate_post, vectorize_post, add_single_post_to_database, add_multiple_posts_to_database
import glob, sys


def import_single_post(path_to_post):
	workflow = chain(
			read_and_validate_post.s(path_to_post),
			vectorize_post.s(),
			add_single_post_to_database.s()).apply_async()

def import_multiple_posts(path_to_folder):
	paths =  glob.glob(path_to_folder + '/*.json')
	posts = group(read_and_validate_post.s(path) for path in paths).apply_async().get()
	posts_vectorized = group(vectorize_post.s(post) for post in posts).apply_async().get()
	add_multiple_posts_to_database.delay(posts=posts_vectorized)



if __name__ == '__main__':

	if sys.argv[1] == '-f':
		import_single_post(sys.argv[2])
	elif sys.argv[1] == '-d':
		import_multiple_posts(sys.argv[2])
	else:
		print('Wrong argument. Use -f for single post or -d for folder\n')
		print("Usage: python3 import_posts.py -f <path_to_post>")
		print("Usage: python3 import_posts.py -d <path_to_folder>")
		sys.exit(1)
