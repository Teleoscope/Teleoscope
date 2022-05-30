import { connectToDatabase } from "../../../util/mongodb";

export default async (req, res) => {
  const { db } = await connectToDatabase();
  const { teleoscopes } = req.query;
  const teleoscope = await db.collection("teleoscopes").findOne({_id: teleoscopes});
  res.json(teleoscope);
};
