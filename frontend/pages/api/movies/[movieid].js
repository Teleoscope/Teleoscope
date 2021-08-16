import { connectToDatabase } from "../../../util/mongodb";
const { ObjectId } = require("mongodb");

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { movieid } = req.query;
  const id = new ObjectId(movieid);
  const movies = await db
    .collection("movies")
    .find({ _id: id })
    .sort({ metacritic: -1 })
    .limit(20)
    .toArray();
  res.json(movies);
};
