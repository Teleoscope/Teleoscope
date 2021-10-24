import re
from aiohttp import web
import subprocess
import tasks
from celery import chain
from celery import signature

from aiohttp_middlewares import (
    cors_middleware,
    error_middleware,
)


async def handle_query(query):
    print(f'Building query: {query}...')
    f = tasks.run_query_init.signature(
        args=(),
        kwargs={"query_string": query},
    )
    t = tasks.query_scs.signature(
        args=(),
        kwargs={"query_string": query, "doc_string": query},
    )
    res = chain(f, t)()
    data = {
        "query": query,
    }
    return data


async def handle_sims(query, ids):
    print(f'Running sims: {ids} for {query}...')
    t = tasks.query_scs_by_ids.signature(
        args=(),
        kwargs={"query_string": query, "ids_string": ids},
    )
    res = t.apply_async()
    data = {
        "query": query,
        "ids": ids,
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
    return False


async def handle(req):
    qs = req.query_string
    print(f'Received query string: {qs}')
    data = {"bad": "format"}
    args = parseargs(qs)
    if args:
        if args[0] and args[1]:
            data = await handle_sims(args[0], args[1])
        elif args[0] and not args[1]:
            data = await handle_query(args[0])
    return web.json_response(data)


app = web.Application(
    middlewares=[
        cors_middleware(
            origins=[re.compile(r"^https?\:\/\/localhost")]
        )
    ]
)

app.add_routes([
    web.get('/', handle),
    # web.get('/query/{query}', handle_query),
    # web.get('/sims/{sims}', handle_sims)
])

if __name__ == '__main__':
    web.run_app(app)
