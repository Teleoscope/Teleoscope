# builtin modules
import re
import logging

# installed modules
from aiohttp import web
from celery import chain
from aiohttp_middlewares import (
    cors_middleware,
    error_middleware,
)

# local files
import tasks

logging.basicConfig(level=logging.INFO)


async def handle_query(query):
    logging.info(f"Building query: {query}...")
    task1 = tasks.run_query_init.signature(
        args=(),
        kwargs={"query_string": query},
    )
    task2 = tasks.query_scs.signature(
        args=(),
        kwargs={"query_string": query, "doc_string": query},
    )
    res = chain(task1, task2)()
    data = {
        "query": query,
        "status": 200,
    }
    return data


async def handle_sims(query, ids):
    logging.info(f"Running sims: {ids} for {query}...")
    task = tasks.query_scs_by_ids.signature(
        args=(),
        kwargs={"query_string": query, "ids_string": ids},
    )
    res = task.apply_async()
    data = {
        "query": query,
        "ids": ids,
        "status": 200,
    }
    return data


def parseargs(qs):
    rgx = '(query=([a-zA-Z,][a-zA-Z,][a-zA-Z,]+?))&(sims=([a-z0-9\\+ ]*)&)?'
    args = re.compile(rgx)
    m = args.match(qs)
    if m:
        query = m.group(2)
        sims = m.group(4)
        return (query, sims)
    logging.error(f"Could not parse query string input: {qs}")
    return False


async def handle(req):
    qs = req.query_string
    logging.info(f"Received query string: {qs}")
    data = {"Status": 400}
    args = parseargs(qs)
    if args:
        if args[0] and args[1]:
            data = await handle_sims(args[0], args[1])
        elif args[0] and not args[1]:
            data = await handle_query(args[0])
    return web.json_response(data)


async def user_interaction(req):
    qs = req.query_string
    [q, _id, status] = [s.split("=")[1] for s in qs.split("&")]
    logging.info(f"Running NLP model with query {q}, post id {_id}")
    task = tasks.nlp.signature(
        args=(), 
        kwargs={"query_string": q, "post_id":_id, "status": -1}
    )
    print(task)
    res = task.apply_async()
    data = {"Status": 200}
    return web.json_response(data)

async def use_model(text):
    task = tasks.getEmbedding.signature(
        args=(), 
        kwargs={"text":text}
    )
    print(task)
    res = task.apply_async()
    data = {"Status": 200}
    return web.json_response(data)


async def post_handler(request):
    post = await request.post()
    print("beep", post)

app = web.Application(
    middlewares=[
        cors_middleware(
            origins=[re.compile(r"^https?\:\/\/localhost")]
        )
    ]
)

app.add_routes([
    web.get('/', handle),
    web.get('/user-interaction/', user_interaction),
    web.post('/post', post_handler),

    # web.get('/query/{query}', handle_query),
    # web.get('/sims/{sims}', handle_sims)
])

# session = aiohttp.ClientSession()

if __name__ == '__main__':
    web.run_app(app)
