from celery import chain, group, chord
from tasks import read_and_validate_post, vectorize_post, add_single_post_to_database, add_multiple_posts_to_database
import glob

path_to_single_post = '../posts/test_post.json'
path_to_folder = '../posts'

def import_single_post(path_to_post):
	workflow = chain(
			read_and_validate_post.s(path_to_post),
			vectorize_post.s(),
			add_single_post_to_database.s()).apply_async()

# Test
# import_single_post(path_to_single_post)

def import_multiple_posts(path_to_folder):
	paths =  glob.glob(path_to_folder + '/*.json')
	posts = group(read_and_validate_post.s(path) for path in paths).apply_async().get()
	posts_vectorized = group(vectorize_post.s(post) for post in posts).apply_async().get()
	add_multiple_posts_to_database.delay(posts=posts_vectorized)

# Test
# import_multiple_posts(path_to_folder)