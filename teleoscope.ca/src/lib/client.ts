import axios from 'axios';

export default async function post(data) {
  console.log("posting", data)
  try {
    const response = await axios.post("/api/client", data);
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}