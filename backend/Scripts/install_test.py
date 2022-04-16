import asyncio
import tasks
import server
import utils


async def main():
	print('testing connection to mongodb (utils.connect)')
	utils.connect()
	print('completed testing utils.connect')

	print('testing search for mdb (utils.find)')
	q = utils.query("password")
	utils.find(q)
	print('completed testing search for mdb (utils.find)')

	print('testing server.user_interaction...')
	class Req:
		query_string = "query=password&pid=j1f7am&status=200"
	r = Req()
	await server.user_interaction(r)
	print('completed testing server.user_interaction')

asyncio.run(main())