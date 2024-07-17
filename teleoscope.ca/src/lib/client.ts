"use server";
// import axios from 'axios';
import send from './amqp';

interface Data {
  task: any,
  args: any
}

export default async function post(data: Data) {
  // console.log("posting", data)
  // send(data.task, data.args)
  try {
    send(data.task, data.args)
    // const response = await axios.post("/api/client", data);
    // console.log("response", response.data);
  } catch (error) {
    console.error(error);
  }
}