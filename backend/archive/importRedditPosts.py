import tasks, requests, time, json, os, import_documents

url = "https://api.pushshift.io/reddit/search/submission"

def crawl_page(subreddit: str, last_page = None):
  """Crawl a page of results from a given subreddit.

  :param subreddit: The subreddit to crawl.
  :param last_page: The last downloaded page.

  :return: A page or results.
  """
  params = {"subreddit": subreddit, "size": 500, "sort": "desc", "sort_type": "created_utc"}
  if last_page is not None:
    if len(last_page) > 0:
      # resume from where we left at the last page
      params["before"] = last_page[-1]["created_utc"]
    else:
      # the last page was empty, we are past the last page
      return []
  results = requests.get(url, params)
  if not results.ok:
    # something wrong happened
    raise Exception("Server returned status code {}".format(results.status_code))
  return results.json()["data"]

def save_page_as_separate_files(page):
	"""Save a page of results as separate files.

	:param page: The page to save.
	"""
	for submission in page:
		with open(os.path.join("../documents", "{}.json".format(submission["id"])), "w") as f:
			json.dump(submission, f)

def save_page(page, curr):
  """Save a page of results as a single file.

  :param page: The page to save.
  """
  with open(f"../documents/page{curr}.json", "w") as f:
    json.dump(page, f)

def crawl_subreddit(subreddit):
  """
  Crawl submissions from a subreddit.

  :param subreddit: The subreddit to crawl.
  :param max_submissions: The maximum number of submissions to download.

  :return: A list of submissions.
  """
  curr = 8754
  with open(f"../documents/page8753.json", "r") as f:
    prev_page = json.load(f)
  while prev_page != []:
    prev_page = crawl_page(subreddit, prev_page)
    #import_documents.import_multiple_documents_from_list(prev_page)
    save_page(prev_page, curr)
    curr += 1
    time.sleep(3)

def page_to_database(path_to_page):
  """
  Save a page of results to the database.

  :param page: The page to save.
  """
  # read page from file
  with open(path_to_page, "r") as f:
    page = json.load(f)
  import_documents.import_multiple_documents_from_list(page)

crawl_subreddit('AmItheAsshole')



