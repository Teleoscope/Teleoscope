import zreader
import ujson as json
import argparse

parser = argparse.ArgumentParser(
                    prog='Pushshift to MongoDB',
                    description='Takes Pushshift ZST files and puts them into MongoDB.',
                    epilog='Still under construction.')

parser.add_argument('directory')          # directory to parse
parser.add_argument('-d', '--database')   # which database to insert into
parser.add_argument('-s', '--subreddit')  # the subreddit to parse
parser.add_argument('-c', '--check',
                    action='check_true')  # only print the output rather than inserting into MongoDB


# Adjust chunk_size as necessary -- defaults to 16,384 if not specified
# reader = zreader.Zreader("reddit_data.zst", chunk_size=8192)

# Read each line from the reader
# for line in reader.readlines():
    # obj = json.loads(line)


if __name__ == "__main__":
    args = parser.parse_args()
    print(args)